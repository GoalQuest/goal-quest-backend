import express from "express";
import {
  deleteUser,
  forgotPassword,
  getAllUsers,
  getUser,
  login,
  registerUser,
  resetPassword,
  updateUser,
  verifyEmail,
} from "../controllers/userController.js";
import {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateEmail,
  validateForgotPassword,
  validateResetPassword,
} from "../middlewares/userValidator.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

router.post(
  "/register",
  upload.single("profilePicture"),
  validateRegister,
  handleValidationErrors,
  registerUser
);
router.post(
  "/verify-email",
  validateEmail,
  handleValidationErrors,
  verifyEmail
);
router.post("/login", validateLogin, handleValidationErrors, login);
router.get("/get-all", authMiddleware, adminMiddleware, getAllUsers);

router.post(
  "/forgot-password",
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword
);
router.post(
  "/reset-password",
  validateResetPassword,
  handleValidationErrors,
  resetPassword
);
router.get("/get/:userId", authMiddleware, getUser);
router.put("/update/:userId", authMiddleware, updateUser);
router.delete("/delete/:userId", authMiddleware, deleteUser);

export default router;
