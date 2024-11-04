import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import Authentication from "../models/authModel.js";
import upload from "../config/multerConfig.js";
import verificationCodeEmailTemplate from "../emails/verificationCodeEmailTemplate.js";
import forgotPasswordEmailTemplate from "../emails/forgotPasswordEmailTemplate.js";
import passwordChangeEmailTemplate from "../emails/passwordChangeEmailTemplate.js";
import verificationCodeAndExpiration from "../utils/verificationCodeGenerator.js";

// register user
const registerUser = async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    email,
    username,
    password,
    confirmPassword,
    role,
  } = req.body;

  const profilePicture = req.file;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // verification code
    const { verificationCode, codeExpiration } =
      verificationCodeAndExpiration();

    // auth document
    const authDoc = new Authentication({
      password: hashedPassword,
      isVerified: false,
      verificationCode,
      verificationCodeExpires: codeExpiration,
    });

    const savedAuth = await authDoc.save();

    const userDoc = new User({
      username,
      email,
      firstName,
      middleName,
      lastName,
      password: hashedPassword,
      profilePicture: profilePicture.filename,
      authId: savedAuth._id,
      role,
    });
    const savedUser = await userDoc.save();

    // save user id on auth model
    savedAuth.userId = savedUser._id;
    await savedAuth.save();

    // send verification email
    verificationCodeEmailTemplate(email, verificationCode);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        userId: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        fullName: `${savedUser.firstName} ${savedUser.lastName}`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// verify email
const verifyEmail = async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;

    const authRecord = await Authentication.findOne({ userId: userId });
    if (!authRecord) {
      return res.status(404).json({ message: "User not found" });
    }

    if (authRecord.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (
      authRecord.verificationCode === verificationCode &&
      new Date(authRecord.verificationCodeExpires).getTime() > Date.now()
    ) {
      authRecord.isVerified = true;
      authRecord.verificationCode = null;
      authRecord.verificationCodeExpires = null;
      await authRecord.save();

      res.status(200).json({ message: "Email verified successfully" });
    } else {
      res.status(400).json({ message: "Invalid or expired verification code" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const authRecord = await Authentication.findOne({ userId: user._id });
    if (!authRecord) {
      return res
        .status(404)
        .json({ message: "Authentication record not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (!authRecord.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        userId: user._id,
        email: user.email,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// get user by id
const getUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select("-password -authId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Server error while fetching user" });
  }
};

// get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -authId");

    res.status(200).json({
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// update user attributes
const updateUser = async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;

  try {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
      select: "-password -authId",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error occured while updating user:", error);
    res.status(500).json({ message: "Server error while updating user" });
  }
};

// delete user
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error occured while deleting user:", error);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

// forgot password
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).select("-password -authId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    await Authentication.findOneAndUpdate(
      { userId: user._id },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpires: Date.now() + 3600000, // expires in one hour
      },
      { new: true, runValidators: true }
    );

    await forgotPasswordEmailTemplate(
      email,
      `${user.firstName} ${user.lastName}`,
      resetToken
    );

    return res.status(200).json("Password reset email sent");
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return next(error);
  }
};
// reset password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("id firstName email");

    if (!user) {
      return res.json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    await passwordChangeEmailTemplate(user.email, user.firstName);

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.json({ message: "Invalid or expired token" });
  }
};

export {
  registerUser,
  verifyEmail,
  login,
  getUser,
  getAllUsers,
  updateUser,
  deleteUser,
  forgotPassword,
  resetPassword,
};
