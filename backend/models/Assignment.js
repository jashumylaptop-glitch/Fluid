import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  subject: { type: String },
  description: { type: String },
  dueDate: { type: Date },
  status: { type: String, enum: ["pending", "completed"], default: "pending" }
});

export default mongoose.model("Assignment", AssignmentSchema);
