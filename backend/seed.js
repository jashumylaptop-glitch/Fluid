import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Student from './models/Student.js';
import Teacher from './models/Teacher.js';
import Timetable from './models/Timetable.js';
import Attendance from './models/Attendance.js';
import Mark from './models/Mark.js';
import Assignment from './models/Assignment.js';
import Resource from './models/Resource.js';
import Message from './models/Message.js';

const MONGO = process.env.MONGO || 'mongodb://127.0.0.1:27017/Fluid';

async function run() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB for seeding');

  const email = process.env.SEED_EMAIL || 'test.student@example.com';
  const rawPassword = process.env.SEED_PASSWORD || 'pass123';
  const teacherEmail = process.env.SEED_TEACHER_EMAIL || 'test.teacher@example.com';
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || 'pass123';

  let student = await Student.findOne({ email });
  const shouldSeedRelated = !student;
  let studentId = student?.studentId;

  if (!student) {
    const hashed = await bcrypt.hash(rawPassword, 10);
    studentId = Student.generateStudentId();
    student = new Student({
      studentId,
      email,
      password: hashed,
      firstName: 'Seed',
      lastName: 'Student',
      grade: '10',
      profile: {
        phone: '+1 (555) 456-7890',
        program: 'Biology',
        status: 'active'
      }
    });

    await student.save();
    console.log('Created student:', email, '->', studentId);
    console.log('Login with:', email, '/', rawPassword);
  } else {
    console.log('Student already exists:', student.studentId);
  }

  const teacherExisting = await Teacher.findOne({ email: teacherEmail });
  if (!teacherExisting) {
    const teacherHashed = await bcrypt.hash(teacherPassword, 10);
    const teacherId = Teacher.generateTeacherId();
    const teacher = new Teacher({
      teacherId,
      email: teacherEmail,
      password: teacherHashed,
      firstName: 'Dr.',
      lastName: 'Johnson',
      subjects: ['Mathematics', 'Physics'],
      studentIds: studentId ? [studentId] : []
    });
    await teacher.save();
    console.log('Created teacher:', teacherEmail, '->', teacherId);
    console.log('Teacher login with:', teacherEmail, '/', teacherPassword);
  } else {
    const existingIds = Array.isArray(teacherExisting.studentIds) ? teacherExisting.studentIds : [];
    if (studentId && !existingIds.includes(studentId)) {
      teacherExisting.studentIds = [...existingIds, studentId];
      await teacherExisting.save();
      console.log('Updated teacher studentIds for:', teacherExisting.teacherId);
    } else {
      console.log('Teacher already exists:', teacherExisting.teacherId);
    }
  }

  if (!studentId) {
    process.exit(0);
  }

  if (shouldSeedRelated) {
    // create some related sample records
    const today = new Date().toISOString().split('T')[0];
    await Timetable.create({
      studentId,
      date: today,
      focus: "Review algebraic expressions",
      classes: [
        { time: "09:00 - 10:00", subject: "Mathematics", teacher: "Ms. Patel" },
        { time: "10:15 - 11:15", subject: "English", teacher: "Mr. Brown" },
        { time: "11:30 - 12:30", subject: "Biology", teacher: "Dr. Lee" }
      ]
    });

    // week schedule (just duplicate today for simplicity)
    for (let i = 1; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      await Timetable.create({
        studentId,
        date: d.toISOString().split('T')[0],
        focus: "Today's focus",
        classes: [
          { time: "09:00 - 10:00", subject: "Subject A", teacher: "Teacher A" }
        ]
      }).catch(() => {}); // ignore duplicates
    }

    // attendance records (random)
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      await Attendance.create({
        studentId,
        date: d,
        present: Math.random() > 0.1,
        subject: "General"
      });
    }

    // marks
    await Mark.create({ studentId, examName: "Midterm", subject: "Math", score: 85, total: 100, date: new Date() });
    await Mark.create({ studentId, examName: "Midterm", subject: "Science", score: 78, total: 100, date: new Date() });

    // assignments
    await Assignment.create({
      studentId,
      title: "Math homework",
      subject: "Linear Algebra",
      dueDate: new Date(Date.now() + 3*24*3600),
      status: "pending"
    });
    await Assignment.create({
      studentId,
      title: "History essay",
      subject: "Research Methods",
      dueDate: new Date(Date.now() - 2*24*3600),
      status: "completed"
    });

    // resources
    await Resource.create({ studentId, title: "Algebra notes", type: "pdf", url: "https://example.com/algebra.pdf" });
    await Resource.create({ studentId, title: "Chemistry video", type: "video", url: "https://example.com/chem.mp4" });

    // messages
    await Message.create({ studentId, from: "Ms. Patel", content: "Don't forget the algebra test on Friday." });
    await Message.create({ studentId, from: "Admin", content: "School will be closed next Monday." });
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
