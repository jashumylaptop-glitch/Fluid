import mongoose from "mongoose";
import { nanoid } from "nanoid";

const TeacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  subjects: [String],
  studentIds: [{ type: String, index: true }],
  createdAt: { type: Date, default: () => new Date() }
});

TeacherSchema.statics.generateTeacherId = function () {
  const year = new Date().getFullYear().toString().slice(-2);
  const unique = nanoid(6).toUpperCase();
  return `TCH-${year}-${unique}`;
};

export default mongoose.model("Teacher", TeacherSchema);
