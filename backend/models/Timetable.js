// backend/models/Timetable.js
import mongoose from "mongoose";

const TimetableSchema = new mongoose.Schema({
  studentId: {
    type: String,        // use your custom student ID like "STU-2026-001"
    required: true
  },
  date: {
    type: String,        // format "YYYY-MM-DD"
    required: true
  },
  focus: {
    type: String,
    default: "Main focus for today"
  },
  classes: [
    {
      time: { type: String },       // e.g., "09:00 - 10:00"
      subject: { type: String },
      room: { type: String },
      teacher: { type: String },
      flowStage: {
        type: String,
        enum: ["Now", "Next", "Done", "Upcoming"],
        default: null
      }
    }
  ]
});

// Ensure a student has only one timetable per day
TimetableSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.model("Timetable", TimetableSchema,"timetable");