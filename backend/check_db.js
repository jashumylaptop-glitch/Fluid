import mongoose from 'mongoose';
import Student from './models/Student.js';
import Timetable from './models/Timetable.js';
import Attendance from './models/Attendance.js';
import Mark from './models/Mark.js';
import Assignment from './models/Assignment.js';
import Resource from './models/Resource.js';
import Message from './models/Message.js';

const MONGO = process.env.MONGO || 'mongodb://127.0.0.1:27017/Fluid';

async function run() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB for check');

  const student = await Student.findOne({ email: process.env.SEED_EMAIL || 'test.student@example.com' }).lean();
  if (!student) {
    console.log('No student found with seeded email. Listing first 5 students:');
    const students = await Student.find().limit(5).lean();
    console.log(JSON.stringify(students, null, 2));
    process.exit(0);
  }

  const sid = student.studentId;
  console.log('Found student:', sid, student.firstName, student.lastName, student.email);

  const tcount = await Timetable.countDocuments({ studentId: sid });
  const acount = await Attendance.countDocuments({ studentId: sid });
  const mcount = await Mark.countDocuments({ studentId: sid });
  const ascount = await Assignment.countDocuments({ studentId: sid });
  const rcount = await Resource.countDocuments({ studentId: sid });
  const msgcount = await Message.countDocuments({ studentId: sid });

  console.log('Counts for studentId:', sid);
  console.log(' Timetables:', tcount);
  console.log(' Attendance records:', acount);
  console.log(' Marks:', mcount);
  console.log(' Assignments:', ascount);
  console.log(' Resources:', rcount);
  console.log(' Messages:', msgcount);

  const sampleTimetable = await Timetable.findOne({ studentId: sid }).lean();
  console.log('Sample timetable (if any):', sampleTimetable ? JSON.stringify(sampleTimetable, null, 2) : 'none');

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
