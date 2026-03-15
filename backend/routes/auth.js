import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Admin from "../models/Admin.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function modelForRole(role) {
  if (!role) return null;
  role = role.toLowerCase();
  if (role === "student") return Student;
  if (role === "teacher") return Teacher;
  if (role === "admin") return Admin;
  return null;
}

// Register endpoint for any role
router.post("/register", async (req, res) => {
  try {
    const { role, email, password, firstName, lastName, extra } = req.body;
    if (!role || !email || !password) return res.status(400).json({ message: "role, email and password are required" });

    const normalizedRole = String(role).trim().toLowerCase();
    const normalizedEmail = String(email).trim().toLowerCase();

    const Model = modelForRole(normalizedRole);
    if (!Model) return res.status(400).json({ message: "Invalid role" });

    // check existing
    const existing = await Model.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    let id;
    if (role.toLowerCase() === "student") {
      id = Model.generateStudentId();
    } else if (role.toLowerCase() === "teacher") {
      id = Model.generateTeacherId();
    } else if (role.toLowerCase() === "admin") {
      id = Model.generateAdminId();
    }

    const payload = {
      email: normalizedEmail,
      password: hashed,
      firstName: firstName ? String(firstName).trim() : firstName,
      lastName: lastName ? String(lastName).trim() : lastName,
      createdAt: new Date(),
    };

    if (normalizedRole === "student") payload.studentId = id;
    if (normalizedRole === "teacher") payload.teacherId = id;
    if (normalizedRole === "admin") payload.adminId = id;

    if (extra && typeof extra === "object") Object.assign(payload, extra);

    const doc = new Model(payload);
    await doc.save();

    const token = jwt.sign({ role: normalizedRole, id: id, email: normalizedEmail }, JWT_SECRET, { expiresIn: "8h" });

    return res.status(201).json({
      token,
      role: normalizedRole,
      studentId: normalizedRole === "student" ? id : null,
      teacherId: normalizedRole === "teacher" ? id : null,
      adminId: normalizedRole === "admin" ? id : null,
      userId: id
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login endpoint (role required to scope search)
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: "email, password and role required" });

    const normalizedRole = String(role).trim().toLowerCase();
    const normalizedEmail = String(email).trim().toLowerCase();

    const Model = modelForRole(normalizedRole);
    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const user = await Model.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // Ensure studentId exists for students
    let studentId = null;
    let teacherId = null;
    let adminId = null;
    if (normalizedRole === "student") {
      studentId = user.studentId;
      if (!studentId) {
        studentId = Model.generateStudentId();
        user.studentId = studentId;
        await user.save();
      }
    } else if (normalizedRole === "teacher") {
      teacherId = user.teacherId;
      if (!teacherId) {
        teacherId = Model.generateTeacherId();
        user.teacherId = teacherId;
        await user.save();
      }
    } else if (normalizedRole === "admin") {
      adminId = user.adminId;
      if (!adminId) {
        adminId = Model.generateAdminId();
        user.adminId = adminId;
        await user.save();
      }
    }

    const id = studentId || teacherId || adminId || user._id;
    const token = jwt.sign({ role: normalizedRole, id, email: normalizedEmail }, JWT_SECRET, { expiresIn: "8h" });

    return res.json({
      token,
      role: normalizedRole,
      studentId: studentId || null,
      teacherId: teacherId || null,
      adminId: adminId || null,
      userId: id
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// simple token inspection
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "No token" });
    const parts = auth.split(" ");
    if (parts.length !== 2) return res.status(401).json({ message: "Invalid auth header" });
    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ ok: true, decoded });
  } catch (err) {
    console.error("/me error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
});

export default router;