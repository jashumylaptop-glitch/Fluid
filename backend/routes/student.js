import express from "express";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Timetable from "../models/Timetable.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import Assignment from "../models/Assignment.js";
import Resource from "../models/Resource.js";
import Message from "../models/Message.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const VALID_FLOW_STAGES = new Set(["Now", "Next", "Done", "Upcoming"]);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function fallbackChatReply(message, activeSection) {
  const text = (message || "").toLowerCase();

  if (text.includes("attendance")) {
    return "Attendance shows subject-wise percentage and helps you spot low attendance early.";
  }
  if (text.includes("mark") || text.includes("grade") || text.includes("score")) {
    return "Marks shows subject scores and trends. Start with low-scoring subjects for your next revision block.";
  }
  if (text.includes("timetable") || text.includes("schedule") || text.includes("class")) {
    return "Timetable gives your weekly class schedule, and Today Flow gives a focused now/next sequence.";
  }
  if (text.includes("assignment") || text.includes("homework")) {
    return "Assignments lists pending work and due dates. Complete urgent items first, then medium priority.";
  }
  if (text.includes("resource") || text.includes("material")) {
    return "Resources contains teacher-shared notes and files. Use it as your revision source before exams.";
  }
  if (text.includes("message") || text.includes("notification")) {
    return "Messages contains updates from school and teachers. Check notification bell for new alerts.";
  }

  if (activeSection) {
    return `You are in ${activeSection}. Ask me about attendance, marks, timetable, assignments, resources, or messages and I will explain simply.`;
  }

  return "Ask me about attendance, marks, timetable, assignments, resources, or messages. I can explain each in simple terms.";
}

async function generateGeminiReply({ message, history, studentProfile, activeSection }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { reply: fallbackChatReply(message, activeSection), source: "fallback" };
  }

  const safeHistory = Array.isArray(history)
    ? history
        .slice(-12)
        .map((item) => ({
          role: item?.role === "assistant" ? "assistant" : "user",
          text: String(item?.text || "").slice(0, 1200)
        }))
        .filter((item) => item.text.trim().length > 0)
    : [];

  const profileSummary = {
    name: [studentProfile?.firstName, studentProfile?.lastName].filter(Boolean).join(" ") || studentProfile?.fullName || "Student",
    grade: studentProfile?.grade || "N/A",
    section: activeSection || "dashboard"
  };

  const promptParts = [
    {
      text:
        "You are a school student assistant. Be concise, friendly, and practical. Explain dashboard features in simple language. Do not invent marks or attendance values. If data is missing, say so clearly."
    },
    {
      text: `Student context: ${JSON.stringify(profileSummary)}`
    },
    {
      text: `Conversation history: ${JSON.stringify(safeHistory)}`
    },
    {
      text: `User question: ${message}`
    }
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: promptParts
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 450
        }
      })
    }
  );

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${raw.slice(0, 200)}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!reply) {
    return { reply: fallbackChatReply(message, activeSection), source: "fallback" };
  }

  return { reply, source: "gemini" };
}

// simple authentication middleware that verifies JWT and attaches decoded payload
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token provided" });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ message: "Invalid auth header" });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// verify that the studentId in the path matches the one from token (or is admin/teacher etc)
router.use("/:studentId", authMiddleware, (req, res, next) => {
  const { studentId } = req.params;
  if (req.user && req.user.id && req.user.id !== studentId) {
    // you could also allow admin or teacher roles here if needed
    return res.status(403).json({ message: "Forbidden: mismatched student" });
  }
  next();
});

// dashboard stats
router.get("/:studentId/dashboard", async (req, res) => {
  try {
    const { studentId } = req.params;
    const today = new Date().toISOString().split("T")[0];
    const todayTb = await Timetable.findOne({ studentId, date: today });
    const totalClasses = (todayTb && todayTb.classes) ? todayTb.classes.length : 0;
    const pendingAssignments = await Assignment.countDocuments({ studentId, status: "pending" });
    const allAttendance = await Attendance.find({ studentId });
    let attendancePercent = 0;
    if (allAttendance.length) {
      attendancePercent = (allAttendance.filter((a) => a.present).length / allAttendance.length) * 100;
    }
    res.json({ totalClasses, pendingAssignments, attendancePercent });
  } catch (err) {
    console.error("dashboard error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// weekly timetable
router.get("/:studentId/timetable", async (req, res) => {
  try {
    const { studentId } = req.params;
    const now = new Date();
    // monday as first day
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const weekItems = await Timetable.find({ studentId, date: { $in: dates } });
    res.json({ week: weekItems });
  } catch (err) {
    console.error("timetable week error", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:studentId/timetable/flow-stage", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date, subject, time, stage } = req.body || {};

    if (!subject || !time) {
      return res.status(400).json({ message: "subject and time are required" });
    }

    if (stage !== null && stage !== undefined && !VALID_FLOW_STAGES.has(stage)) {
      return res.status(400).json({ message: "Invalid stage value" });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];

    const updateResult = await Timetable.updateOne(
      { studentId, date: targetDate, "classes.subject": subject, "classes.time": time },
      {
        $set: {
          "classes.$.flowStage": stage ?? null
        }
      }
    );

    if (!updateResult.matchedCount) {
      return res.status(404).json({ message: "Class not found for selected date" });
    }

    return res.json({
      message: "Flow stage updated",
      studentId,
      date: targetDate,
      subject,
      time,
      stage: stage ?? null
    });
  } catch (err) {
    console.error("timetable flow stage update error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// attendance records
router.get("/:studentId/attendance", async (req, res) => {
  try {
    const { studentId } = req.params;
    const records = await Attendance.find({ studentId });
    res.json({ records });
  } catch (err) {
    console.error("attendance error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// marks
router.get("/:studentId/marks", async (req, res) => {
  try {
    const { studentId } = req.params;
    const marks = await Mark.find({ studentId });
    res.json({ marks });
  } catch (err) {
    console.error("marks error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// assignments
router.get("/:studentId/assignments", async (req, res) => {
  try {
    const { studentId } = req.params;
    const assignments = await Assignment.find({ studentId });
    res.json({ assignments });
  } catch (err) {
    console.error("assignments error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// assignment update (status/title/etc.)
router.put("/:studentId/assignments/:assignmentId", async (req, res) => {
  try {
    const { studentId, assignmentId } = req.params;
    const updates = {};
    ["title", "subject", "description", "dueDate", "status"].forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (updates.status && !["pending", "completed"].includes(updates.status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const assignment = await Assignment.findOneAndUpdate(
      { _id: assignmentId, studentId },
      updates,
      { new: true }
    );

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json({ assignment });
  } catch (err) {
    console.error("assignment update error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// resources
router.get("/:studentId/resources", async (req, res) => {
  try {
    const { studentId } = req.params;
    const resources = await Resource.find({ studentId });
    res.json({ resources });
  } catch (err) {
    console.error("resources error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// messages
router.get("/:studentId/messages", async (req, res) => {
  try {
    const { studentId } = req.params;
    const messages = await Message.find({ studentId }).sort({ date: -1 });
    res.json({ messages });
  } catch (err) {
    console.error("messages error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// profile (get)
router.get("/:studentId/profile", async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId }, { password: 0, __v: 0, _id: 0 });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const attendanceRecords = await Attendance.find({ studentId }, { present: 1, _id: 0 });
    const attendancePercent = attendanceRecords.length
      ? Math.round((attendanceRecords.filter((a) => a.present).length / attendanceRecords.length) * 100)
      : 0;

    const marks = await Mark.find({ studentId }, { score: 1, total: 1, _id: 0 });
    const gpa = marks.length
      ? (marks
          .reduce((sum, mark) => sum + ((mark.total ? mark.score / mark.total : 0) * 4), 0) /
          marks.length)
          .toFixed(2)
      : null;

    const timetableDocs = await Timetable.find({ studentId }, { classes: 1, _id: 0 });
    const subjects = new Set();
    timetableDocs.forEach((item) => {
      (item.classes || []).forEach((entry) => {
        if (entry.subject) subjects.add(entry.subject);
      });
    });

    const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim();
    const profilePayload = {
      ...student.toObject(),
      fullName: fullName || student.email,
      status: student.profile?.status || "active",
      phone: student.profile?.phone || "N/A",
      program: student.profile?.program || "General",
      attendancePercent,
      gpa,
      activeCourses: subjects.size
    };

    res.json({ profile: profilePayload });
  } catch (err) {
    console.error("profile error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// profile (update)
router.put("/:studentId/profile", async (req, res) => {
  try {
    const { studentId } = req.params;
    const updates = {};
    ["firstName", "lastName", "email", "profile"].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const student = await Student.findOneAndUpdate({ studentId }, updates, { new: true, projection: { password: 0, __v: 0, _id: 0 } });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ profile: student });
  } catch (err) {
    console.error("profile update error", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:studentId/chatbot", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { message, history, activeSection } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }

    const studentProfile = await Student.findOne(
      { studentId },
      { firstName: 1, lastName: 1, grade: 1, email: 1, _id: 0 }
    ).lean();

    let result;
    try {
      result = await generateGeminiReply({
        message: message.trim(),
        history,
        studentProfile,
        activeSection
      });
    } catch (error) {
      console.error("gemini chat error", error.message);
      result = {
        reply: fallbackChatReply(message, activeSection),
        source: "fallback"
      };
    }

    return res.json({
      reply: result.reply,
      source: result.source
    });
  } catch (err) {
    console.error("student chatbot error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:studentId/feedback", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { category, rating, message, course } = req.body || {};

    const normalizedCategory = String(category || "general").toLowerCase();
    const safeMessage = typeof message === "string" ? message.trim() : "";
    const safeCourse = typeof course === "string" ? course.trim() : "";
    const safeRating = Number(rating);

    if (!["general", "course", "suggestion"].includes(normalizedCategory)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    if (!Number.isInteger(safeRating) || safeRating < 1 || safeRating > 5) {
      return res.status(400).json({ message: "rating must be an integer between 1 and 5" });
    }

    if (!safeMessage) {
      return res.status(400).json({ message: "message is required" });
    }

    if (normalizedCategory === "course" && !safeCourse) {
      return res.status(400).json({ message: "course is required for course feedback" });
    }

    const created = await Feedback.create({
      studentId,
      category: normalizedCategory,
      course: normalizedCategory === "course" ? safeCourse : "",
      rating: safeRating,
      message: safeMessage
    });

    return res.status(201).json({
      message: "Feedback saved",
      feedback: {
        id: created._id,
        studentId: created.studentId,
        category: created.category,
        course: created.course,
        rating: created.rating,
        message: created.message,
        createdAt: created.createdAt
      }
    });
  } catch (err) {
    console.error("feedback save error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
