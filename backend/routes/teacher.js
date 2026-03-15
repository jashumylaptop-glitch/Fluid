import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Teacher from "../models/Teacher.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import Timetable from "../models/Timetable.js";
import Message from "../models/Message.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const VALID_EVALUATION_STAGES = new Set(["Pending", "Reviewing", "Published"]);
const VALID_RISK_STAGES = new Set(["Normal", "Watch", "Intervention"]);

function getDominantStage(entries = []) {
  if (!entries.length) return null;
  const stageCount = new Map();
  entries.forEach((stage) => {
    if (!VALID_EVALUATION_STAGES.has(stage)) return;
    stageCount.set(stage, (stageCount.get(stage) || 0) + 1);
  });
  if (stageCount.size === 0) return null;
  return Array.from(stageCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

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
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

router.use("/:teacherId", authMiddleware, (req, res, next) => {
  const { teacherId } = req.params;
  if (!req.user || req.user.role !== "teacher") {
    return res.status(403).json({ message: "Forbidden: teacher access required" });
  }
  if (req.user.id !== teacherId) {
    return res.status(403).json({ message: "Forbidden: mismatched teacher" });
  }
  next();
});

router.get("/:teacherId/dashboard", async (req, res) => {
  try {
    const percentToGrade = (percent) => {
      if (percent >= 95) return "A";
      if (percent >= 90) return "A-";
      if (percent >= 85) return "B+";
      if (percent >= 80) return "B";
      if (percent >= 75) return "B-";
      if (percent >= 70) return "C+";
      if (percent >= 65) return "C";
      if (percent >= 60) return "C-";
      if (percent >= 55) return "D";
      return "F";
    };

    const { teacherId } = req.params;
    const teacher = await Teacher.findOne({ teacherId }, { password: 0, __v: 0, _id: 0 });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const studentIds = Array.isArray(teacher.studentIds) ? teacher.studentIds.filter(Boolean) : [];

    const students = await Student.find(
      { studentId: { $in: studentIds } },
      { _id: 0, email: 1, firstName: 1, lastName: 1, studentId: 1, riskStage: 1 }
    );

    const todayIso = new Date().toISOString().split("T")[0];
    const todayTimetable = await Timetable.find({ date: todayIso, studentId: { $in: studentIds } });
    const allTimetable = await Timetable.find({ studentId: { $in: studentIds } });

    const todayScheduleMap = new Map();
    todayTimetable.forEach((doc) => {
      (doc.classes || []).forEach((item) => {
        if (!item.subject || !item.time) return;
        const key = `${item.subject}-${item.time}`;
        const row = todayScheduleMap.get(key) || {
          subject: item.subject,
          time: item.time,
          room: item.room || "Room TBD",
          students: 0
        };
        row.students += 1;
        todayScheduleMap.set(key, row);
      });
    });

    const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const courseMap = new Map();

    allTimetable.forEach((doc) => {
      const dateObj = new Date(doc.date);
      const dayLabel = Number.isNaN(dateObj.getTime()) ? "Day" : weekdayShort[dateObj.getDay()];

      (doc.classes || []).forEach((item) => {
        if (!item.subject) return;
        const key = item.subject;
        const row = courseMap.get(key) || {
          name: item.subject,
          studentIdSet: new Set(),
          daySet: new Set(),
          timeCountMap: new Map()
        };

        row.studentIdSet.add(doc.studentId);
        row.daySet.add(dayLabel);

        if (item.time) {
          row.timeCountMap.set(item.time, (row.timeCountMap.get(item.time) || 0) + 1);
        }

        courseMap.set(key, row);
      });
    });

    const courses = Array.from(courseMap.values()).map((course) => {
      const dayList = Array.from(course.daySet).slice(0, 3);
      const topTime = Array.from(course.timeCountMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Time TBD";
      const schedule = `${dayList.length ? dayList.join(", ") : "TBD"} — ${topTime}`;

      return {
        name: course.name,
        students: course.studentIdSet.size,
        schedule,
        status: "Active"
      };
    });

    const attendanceRows = await Attendance.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: "$studentId",
          total: { $sum: 1 },
          present: { $sum: { $cond: ["$present", 1, 0] } }
        }
      }
    ]);

    const attendanceBySubjectRows = await Attendance.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: { $ifNull: ["$subject", "General"] },
          total: { $sum: 1 },
          present: { $sum: { $cond: ["$present", 1, 0] } }
        }
      }
    ]);

    const attendanceOverview = attendanceBySubjectRows
      .map((row) => {
        const total = row.total || 0;
        const present = row.present || 0;
        const percent = total ? Math.round((present / total) * 100) : 0;

        return {
          course: row._id || "General",
          present,
          total,
          percent
        };
      })
      .sort((a, b) => b.percent - a.percent);

    const attendanceMap = new Map(
      attendanceRows.map((row) => [row._id, row.total ? Math.round((row.present / row.total) * 100) : 0])
    );

    const markRows = await Mark.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: "$studentId",
          avgPct: {
            $avg: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$score", "$total"] }, 100] },
                0
              ]
            }
          }
        }
      }
    ]);

    const markDocs = await Mark.find(
      { studentId: { $in: studentIds } },
      { _id: 0, studentId: 1, examName: 1, subject: 1, score: 1, total: 1, date: 1, evaluationStage: 1 }
    );

    const marksByStudent = new Map();
    markDocs.forEach((doc) => {
      const safeTotal = doc.total > 0 ? doc.total : 100;
      const percent = Math.round((doc.score / safeTotal) * 100);
      const exam = (doc.examName || "").toLowerCase();
      const isMidterm = exam.includes("mid");
      const row = marksByStudent.get(doc.studentId) || {
        midtermScores: [],
        finalScores: [],
        allScores: [],
        subjectCount: new Map(),
        stageEntries: [],
        stageBySubject: new Map(),
        midtermRaw: [],
        finalRaw: []
      };

      if (isMidterm) {
        row.midtermScores.push(percent);
        row.midtermRaw.push({ score: doc.score || 0, total: safeTotal });
      } else {
        row.finalScores.push(percent);
        row.finalRaw.push({ score: doc.score || 0, total: safeTotal });
      }

      row.allScores.push(percent);
      if (doc.subject) row.subjectCount.set(doc.subject, (row.subjectCount.get(doc.subject) || 0) + 1);

      if (VALID_EVALUATION_STAGES.has(doc.evaluationStage)) {
        row.stageEntries.push(doc.evaluationStage);
        if (doc.subject) {
          const subjectStages = row.stageBySubject.get(doc.subject) || [];
          subjectStages.push(doc.evaluationStage);
          row.stageBySubject.set(doc.subject, subjectStages);
        }
      }

      marksByStudent.set(doc.studentId, row);
    });

    const primarySubjectByStudent = new Map();
    studentIds.forEach((studentId) => {
      const fromMarks = Array.from(marksByStudent.get(studentId)?.subjectCount?.entries() || [])
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      let fromTimetable = null;
      const timetableEntry = allTimetable.find((item) => item.studentId === studentId && (item.classes || []).length > 0);
      if (timetableEntry) {
        fromTimetable = (timetableEntry.classes || []).find((item) => item.subject)?.subject || null;
      }

      primarySubjectByStudent.set(studentId, fromMarks || fromTimetable || "General");
    });

    const messagesDocs = await Message.find(
      { studentId: { $in: studentIds } },
      { _id: 0, studentId: 1, from: 1, content: 1, date: 1, read: 1 }
    ).sort({ date: -1 }).limit(25);

    const gradeMap = new Map(markRows.map((row) => [row._id, Math.round(row.avgPct || 0)]));

    const roster = students.map((student) => {
      const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || student.email;
      const attendance = attendanceMap.get(student.studentId) || 0;
      const avgPercent = gradeMap.get(student.studentId) || 0;

      let grade = "N/A";
      if (avgPercent >= 90) grade = "A";
      else if (avgPercent >= 80) grade = "B+";
      else if (avgPercent >= 70) grade = "B";
      else if (avgPercent >= 60) grade = "C";
      else if (avgPercent > 0) grade = "D";

      let status = "At Risk";
      if (attendance >= 95 && avgPercent >= 85) status = "Excellent";
      else if (attendance >= 85 && avgPercent >= 70) status = "Active";

      return {
        studentId: student.studentId,
        fullName,
        email: student.email,
        course: primarySubjectByStudent.get(student.studentId) || "General",
        grade,
        attendance,
        status,
        riskStage: VALID_RISK_STAGES.has(student.riskStage) ? student.riskStage : null
      };
    });

    const studentMap = new Map(
      students.map((student) => {
        const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || student.email;
        return [student.studentId, { fullName, email: student.email }];
      })
    );

    const gradesOverview = studentIds.map((studentId) => {
      const student = studentMap.get(studentId) || { fullName: studentId, email: "" };
      const marks = marksByStudent.get(studentId);

      const midtermPercent = marks?.midtermScores?.length
        ? Math.round(marks.midtermScores.reduce((sum, value) => sum + value, 0) / marks.midtermScores.length)
        : marks?.allScores?.length
        ? Math.round(marks.allScores.reduce((sum, value) => sum + value, 0) / marks.allScores.length)
        : 0;

      const finalPercent = marks?.finalScores?.length
        ? Math.round(marks.finalScores.reduce((sum, value) => sum + value, 0) / marks.finalScores.length)
        : marks?.allScores?.length
        ? Math.round(marks.allScores.reduce((sum, value) => sum + value, 0) / marks.allScores.length)
        : 0;

      const overallPercent = marks?.allScores?.length
        ? Math.round(marks.allScores.reduce((sum, value) => sum + value, 0) / marks.allScores.length)
        : 0;

      const topSubject = primarySubjectByStudent.get(studentId) || null;

      const midtermRaw = marks?.midtermRaw?.length ? marks.midtermRaw[0] : null;
      const finalRaw = marks?.finalRaw?.length ? marks.finalRaw[0] : null;
      const persistedStage = getDominantStage(
        marks?.stageBySubject?.get(topSubject) || marks?.stageEntries || []
      );

      return {
        studentId,
        student: student.fullName,
        course: topSubject || "General",
        midterm: overallPercent > 0 ? percentToGrade(midtermPercent) : "N/A",
        final: overallPercent > 0 ? percentToGrade(finalPercent) : "N/A",
        overall: overallPercent > 0 ? percentToGrade(overallPercent) : "N/A",
        midtermScore: midtermRaw ? `${midtermRaw.score}/${midtermRaw.total}` : "N/A",
        finalScore: finalRaw ? `${finalRaw.score}/${finalRaw.total}` : "N/A",
        overallPercent,
        evaluationStage: persistedStage || null
      };
    });

    const messagesOverview = messagesDocs.map((item) => {
      const sender = item.from || "School Update";
      const subject = item.content ? item.content.split(".")[0].slice(0, 70) : "Message";

      return {
        studentId: item.studentId,
        from: sender,
        subject,
        preview: item.content || "",
        date: item.date,
        isNew: !item.read
      };
    });

    const totalStudents = roster.length;
    const activeCourses = new Set(todayScheduleMap.values()).size;
    const averageAttendance = totalStudents
      ? Math.round(roster.reduce((sum, item) => sum + item.attendance, 0) / totalStudents)
      : 0;

    const gradeScore = roster
      .map((row) => {
        if (row.grade === "A") return 4;
        if (row.grade === "B+") return 3.5;
        if (row.grade === "B") return 3;
        if (row.grade === "C") return 2;
        if (row.grade === "D") return 1;
        return 0;
      })
      .filter((item) => item > 0);

    const avgGradeValue = gradeScore.length
      ? (gradeScore.reduce((sum, item) => sum + item, 0) / gradeScore.length).toFixed(1)
      : null;

    const avgGrade = avgGradeValue === null
      ? "N/A"
      : avgGradeValue >= 3.8
      ? "A"
      : avgGradeValue >= 3.4
      ? "B+"
      : avgGradeValue >= 2.8
      ? "B"
      : avgGradeValue >= 2
      ? "C"
      : "D";

    const teacherName = [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim() || teacher.email;

    return res.json({
      teacher: {
        teacherId: teacher.teacherId,
        fullName: teacherName,
        email: teacher.email,
        subjects: teacher.subjects || [],
        studentIds
      },
      stats: {
        totalStudents,
        activeCourses,
        averageAttendance,
        avgGrade
      },
      roster,
      todaySchedule: Array.from(todayScheduleMap.values()),
      courses,
      attendanceOverview,
      gradesOverview,
      messagesOverview
    });
  } catch (error) {
    console.error("teacher dashboard error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:teacherId/evaluation-stage", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { studentId, course, stage } = req.body || {};

    if (!studentId || !stage) {
      return res.status(400).json({ message: "studentId and stage are required" });
    }

    if (!VALID_EVALUATION_STAGES.has(stage)) {
      return res.status(400).json({ message: "Invalid stage value" });
    }

    const teacher = await Teacher.findOne({ teacherId }, { _id: 0, studentIds: 1 });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignedStudentIds = Array.isArray(teacher.studentIds) ? teacher.studentIds : [];
    if (!assignedStudentIds.includes(studentId)) {
      return res.status(403).json({ message: "Student is not assigned to this teacher" });
    }

    const updateFilter = { studentId };
    if (course && course !== "General") {
      updateFilter.subject = course;
    }

    let updateResult = await Mark.updateMany(updateFilter, { $set: { evaluationStage: stage } });
    let appliedScope = updateFilter.subject ? "course" : "student";

    if (!updateResult.matchedCount && updateFilter.subject) {
      updateResult = await Mark.updateMany({ studentId }, { $set: { evaluationStage: stage } });
      appliedScope = "student";
    }

    if (!updateResult.matchedCount) {
      return res.status(404).json({ message: "No marks found for selected student/course" });
    }

    return res.json({
      message: "Evaluation stage updated",
      studentId,
      course: course || "General",
      stage,
      appliedScope,
      updatedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error("teacher evaluation stage update error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:teacherId/risk-stage", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { studentId, stage } = req.body || {};

    if (!studentId || !stage) {
      return res.status(400).json({ message: "studentId and stage are required" });
    }

    if (!VALID_RISK_STAGES.has(stage)) {
      return res.status(400).json({ message: "Invalid stage value" });
    }

    const teacher = await Teacher.findOne({ teacherId }, { _id: 0, studentIds: 1 });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignedStudentIds = Array.isArray(teacher.studentIds) ? teacher.studentIds : [];
    if (!assignedStudentIds.includes(studentId)) {
      return res.status(403).json({ message: "Student is not assigned to this teacher" });
    }

    const updated = await Student.findOneAndUpdate(
      { studentId },
      { $set: { riskStage: stage } },
      { new: true, projection: { _id: 0, studentId: 1, riskStage: 1 } }
    );

    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json({
      message: "Risk stage updated",
      studentId: updated.studentId,
      stage: updated.riskStage
    });
  } catch (error) {
    console.error("teacher risk stage update error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:teacherId/mvp/students", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { email, password, firstName, lastName, grade } = req.body || {};

    if (!email) return res.status(400).json({ message: "email is required" });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Student.findOne({ email: normalizedEmail }, { _id: 1 });
    if (existing) return res.status(409).json({ message: "Student email already exists" });

    const studentId = Student.generateStudentId();
    const hashedPassword = await bcrypt.hash(password || "pass123", 10);

    const student = await Student.create({
      studentId,
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName ? String(firstName).trim() : undefined,
      lastName: lastName ? String(lastName).trim() : undefined,
      grade: grade ? String(grade).trim() : undefined
    });

    await Teacher.updateOne(
      { teacherId },
      { $addToSet: { studentIds: studentId } }
    );

    return res.status(201).json({
      message: "Student added and assigned",
      student: {
        studentId: student.studentId,
        email: student.email,
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        grade: student.grade || ""
      }
    });
  } catch (error) {
    console.error("teacher add student error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:teacherId/mvp/students/:studentId/timetable", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const { date, time, subject, room } = req.body || {};

    if (!subject || !time) {
      return res.status(400).json({ message: "subject and time are required" });
    }

    const teacher = await Teacher.findOne({ teacherId }, { _id: 0, studentIds: 1, firstName: 1, lastName: 1, email: 1 });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignedStudentIds = Array.isArray(teacher.studentIds) ? teacher.studentIds : [];
    if (!assignedStudentIds.includes(studentId)) {
      return res.status(403).json({ message: "Student is not assigned to this teacher" });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const teacherName = [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim() || teacher.email || "Teacher";

    const updated = await Timetable.findOneAndUpdate(
      { studentId, date: targetDate },
      {
        $setOnInsert: {
          studentId,
          date: targetDate,
          focus: "Main focus for today"
        },
        $push: {
          classes: {
            time: String(time).trim(),
            subject: String(subject).trim(),
            room: room ? String(room).trim() : "Room TBD",
            teacher: teacherName
          }
        }
      },
      { new: true, upsert: true }
    );

    return res.status(201).json({
      message: "Subject added to timetable",
      studentId,
      date: targetDate,
      classesCount: (updated?.classes || []).length
    });
  } catch (error) {
    console.error("teacher timetable assignment error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:teacherId/mvp/students/:studentId/attendance", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const { date, present, subject } = req.body || {};

    if (present === undefined || present === null) {
      return res.status(400).json({ message: "present is required" });
    }

    const teacher = await Teacher.findOne({ teacherId }, { _id: 0, studentIds: 1 });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignedStudentIds = Array.isArray(teacher.studentIds) ? teacher.studentIds : [];
    if (!assignedStudentIds.includes(studentId)) {
      return res.status(403).json({ message: "Student is not assigned to this teacher" });
    }

    const attendance = await Attendance.create({
      studentId,
      date: date ? new Date(date) : new Date(),
      present: Boolean(present),
      subject: subject ? String(subject).trim() : "General"
    });

    return res.status(201).json({
      message: "Attendance saved",
      attendanceId: attendance._id,
      studentId
    });
  } catch (error) {
    console.error("teacher attendance save error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:teacherId/mvp/students/:studentId/marks", async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const { examName, subject, score, total, date } = req.body || {};

    if (!subject || score === undefined || total === undefined) {
      return res.status(400).json({ message: "subject, score and total are required" });
    }

    const parsedScore = Number(score);
    const parsedTotal = Number(total);
    if (Number.isNaN(parsedScore) || Number.isNaN(parsedTotal) || parsedTotal <= 0 || parsedScore < 0 || parsedScore > parsedTotal) {
      return res.status(400).json({ message: "Invalid score/total values" });
    }

    const teacher = await Teacher.findOne({ teacherId }, { _id: 0, studentIds: 1 });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignedStudentIds = Array.isArray(teacher.studentIds) ? teacher.studentIds : [];
    if (!assignedStudentIds.includes(studentId)) {
      return res.status(403).json({ message: "Student is not assigned to this teacher" });
    }

    const mark = await Mark.create({
      studentId,
      examName: examName ? String(examName).trim() : "Exam",
      subject: String(subject).trim(),
      score: parsedScore,
      total: parsedTotal,
      date: date ? new Date(date) : new Date()
    });

    return res.status(201).json({
      message: "Mark saved",
      markId: mark._id,
      studentId
    });
  } catch (error) {
    console.error("teacher marks save error", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
