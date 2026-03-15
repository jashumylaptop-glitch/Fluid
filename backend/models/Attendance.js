import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  present: { type: Boolean, required: true },
  subject: { type: String }
});

export default mongoose.model("Attendance", AttendanceSchema, "attendance");
