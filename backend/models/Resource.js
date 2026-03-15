import mongoose from "mongoose";

const ResourceSchema = new mongoose.Schema({
  studentId: { type: String, index: true },
  title: { type: String, required: true },
  type: { type: String },
  url: { type: String, required: true }
});

export default mongoose.model("Resource", ResourceSchema);
