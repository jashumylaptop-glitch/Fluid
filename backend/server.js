// backend/server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import timetableRoutes from "./routes/timetable.js"; // legacy, still used by seed
import studentRoutes from "./routes/student.js";
import teacherRoutes from "./routes/teacher.js";

const app = express();
app.use(cors());
app.use(express.json());

const MONGO = process.env.MONGO || "mongodb://127.0.0.1:27017/Fluid";

app.use("/", authRoutes); // login/register endpoints
app.use("/student", timetableRoutes); // old timetable endpoints (e.g. /:studentId/today)
app.use("/student", studentRoutes); // new consolidated student API
app.use("/teacher", teacherRoutes);

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

mongoose
  .connect(MONGO)
  .then(() => {
    const dbName = mongoose.connection?.name || "unknown";
    console.log(`MongoDB Connected (${dbName})`);
  })
  .catch((err) => console.log(err));

app.listen(5000, () => console.log("Server running on port 5000"));