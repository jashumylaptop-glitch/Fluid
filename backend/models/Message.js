import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  from: { type: String },
  content: { type: String },
  date: { type: Date, default: () => new Date() },
  read: { type: Boolean, default: false }
});

export default mongoose.model("Message", MessageSchema);
