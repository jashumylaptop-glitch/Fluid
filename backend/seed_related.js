import mongoose from 'mongoose';
import Student from './models/Student.js';
import Timetable from './models/Timetable.js';
import Attendance from './models/Attendance.js';
import Mark from './models/Mark.js';
import Assignment from './models/Assignment.js';
import Resource from './models/Resource.js';
import Message from './models/Message.js';

const MONGO = process.env.MONGO || 'mongodb://127.0.0.1:27017/Fluid';

function isoDate(d) { return d.toISOString().split('T')[0]; }

async function run() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB for related seeding');

  const email = process.env.SEED_EMAIL || 'test.student@example.com';
  const student = await Student.findOne({ email });
  if (!student) {
    console.error('Seed student not found. Run seed.js first to create the account.');
    process.exit(1);
  }
  const sid = student.studentId;
  console.log('Seeding related docs for', sid);

  const today = new Date();
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'History', 'English'];

  // Timetable week
  const ops = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = isoDate(d);
    const classes = [];
    for (let j = 0; j < 3; j++) {
      classes.push({ time: `${8 + j}:00 - ${9 + j}:00`, subject: subjects[(i + j) % subjects.length], teacher: `Teacher ${(i+j)%5+1}` });
    }
    ops.push({ updateOne: { filter: { studentId: sid, date: dateStr }, update: { $set: { focus: 'Focus ' + dateStr, classes } }, upsert: true } });
  }
  if (ops.length) await Timetable.bulkWrite(ops);
  console.log('Timetable upserted');

  // Attendance - last 30 days
  const adocs = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    adocs.push({ studentId: sid, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), present: Math.random() > 0.15, subject: subjects[i%subjects.length] });
  }
  await Attendance.insertMany(adocs);
  console.log('Attendance inserted:', adocs.length);

  // Marks
  await Mark.insertMany([
    { studentId: sid, examName: 'Midterm 1', subject: 'Mathematics', score: 78, total: 100, date: new Date() },
    { studentId: sid, examName: 'Midterm 1', subject: 'Physics', score: 85, total: 100, date: new Date() }
  ]);
  console.log('Marks inserted');

  // Assignments
  await Assignment.insertMany([
    { studentId: sid, title: 'Algebra worksheet', description: 'Problems 1-20', dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()+3), status: 'pending' },
    { studentId: sid, title: 'Physics lab report', description: 'Lab report', dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()-2), status: 'completed' }
  ]);
  console.log('Assignments inserted');

  // Resources
  await Resource.insertMany([
    { studentId: sid, title: 'Algebra notes (PDF)', type: 'pdf', url: 'https://example.com/algebra.pdf' },
    { studentId: sid, title: 'Physics lecture video', type: 'video', url: 'https://example.com/physics.mp4' }
  ]);
  console.log('Resources inserted');

  // Messages
  await Message.insertMany([
    { studentId: sid, from: 'Ms. Patel', content: "Don't forget the algebra test on Friday.", date: new Date(), read: false },
    { studentId: sid, from: 'Admin', content: 'School will be closed next Monday.', date: new Date(), read: true }
  ]);
  console.log('Messages inserted');

  console.log('Related seeding complete');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
