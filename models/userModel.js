import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    profilePicture: { type: String },
    authId: { type: mongoose.Schema.Types.ObjectId, ref: "Authentication" },
    //   goals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    role: {
      type: String,
      enum: ["admin", "user", "guest"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
