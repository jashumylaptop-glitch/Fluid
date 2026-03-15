import mongoose from "mongoose";
import { nanoid } from "nanoid";

const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  grade: { type: String },
  riskStage: {
    type: String,
    enum: ["Normal", "Watch", "Intervention"],
    default: null
  },
  enrolledAt: { type: Date, default: () => new Date() },
  profile: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() }
});

// helper to generate readable studentId
StudentSchema.statics.generateStudentId = function () {
  const year = new Date().getFullYear().toString().slice(-2);
  const unique = nanoid(6).toUpperCase();
  return `STU-${year}-${unique}`;
};

export default mongoose.model("Student", StudentSchema);
