import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ["general", "course", "suggestion"],
    required: true,
    default: "general"
  },
  course: { type: String, trim: true, maxlength: 120, default: "" },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: () => new Date() }
});

export default mongoose.model("Feedback", FeedbackSchema);