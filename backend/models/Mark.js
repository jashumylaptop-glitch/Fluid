import mongoose from "mongoose";

const MarkSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  examName: { type: String },
  subject: { type: String },
  score: { type: Number },
  total: { type: Number },
  date: { type: Date },
  evaluationStage: {
    type: String,
    enum: ["Pending", "Reviewing", "Published"],
    default: null
  }
});

export default mongoose.model("Mark", MarkSchema);
