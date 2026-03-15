// backend/routes/timetable.js
import express from "express";
import Timetable from "../models/Timetable.js";

const router = express.Router();

// GET today's timetable for a studen
router.get("/:studentId/today", async (req, res) => {
  try {
    const { studentId } = req.params;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // yyyy-mm-dd

    const timetable = await Timetable.findOne({
      studentId,
      date: todayStr
    });

    if (!timetable) return res.json({ message: "No timetable found", classes: [] });

    res.json({
      focus: timetable.focus,
      classes: timetable.classes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;