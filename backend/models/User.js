import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "student" },
  studentId: { type: String, required: false, unique: true } // optional student ID
});

export default mongoose.model("User", userSchema);