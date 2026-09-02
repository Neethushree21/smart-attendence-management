require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Class = require('../models/Class');

/**
 * Seed script: Populates the database with sample data for testing
 * Run: node utils/seedData.js
 */
const seedDatabase = async () => {
  await connectDB();
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data
    await User.deleteMany({});
    await Class.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // ─── Create Admin ──────────────────────────────────────────────────────────
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@attendance.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // ─── Create Teachers ───────────────────────────────────────────────────────
    const teachers = await User.create([
      {
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh@college.edu',
        password: 'teacher123',
        role: 'teacher',
        employeeId: 'EMP001',
        department: 'Computer Science',
      },
      {
        name: 'Prof. Anitha Sharma',
        email: 'anitha@college.edu',
        password: 'teacher123',
        role: 'teacher',
        employeeId: 'EMP002',
        department: 'Mathematics',
      },
    ]);
    console.log(`✅ ${teachers.length} teachers created`);

    // ─── Create Students ───────────────────────────────────────────────────────
    const students = await User.create([
      {
        name: 'Arjun Mehta',
        email: 'arjun@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021001',
        department: 'Computer Science',
        semester: 5,
      },
      {
        name: 'Priya Nair',
        email: 'priya@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021002',
        department: 'Computer Science',
        semester: 5,
      },
      {
        name: 'Ravi Shankar',
        email: 'ravi@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021003',
        department: 'Computer Science',
        semester: 5,
      },
      {
        name: 'Deepa Krishnan',
        email: 'deepa@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021004',
        department: 'Computer Science',
        semester: 5,
      },
      {
        name: 'Vikram Singh',
        email: 'vikram@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021005',
        department: 'Computer Science',
        semester: 5,
      },
    ]);
    console.log(`✅ ${students.length} students created`);

    // ─── Create Classes ────────────────────────────────────────────────────────
    const class1 = await Class.create({
      subjectName: 'Data Structures & Algorithms',
      subjectCode: 'CS301',
      teacherId: teachers[0]._id,
      department: 'Computer Science',
      semester: 5,
      studentIds: students.map((s) => s._id),
    });

    const class2 = await Class.create({
      subjectName: 'Database Management Systems',
      subjectCode: 'CS302',
      teacherId: teachers[0]._id,
      department: 'Computer Science',
      semester: 5,
      studentIds: students.map((s) => s._id),
    });

    const class3 = await Class.create({
      subjectName: 'Engineering Mathematics',
      subjectCode: 'MATH301',
      teacherId: teachers[1]._id,
      department: 'Mathematics',
      semester: 5,
      studentIds: students.map((s) => s._id),
    });

    console.log(`✅ 3 classes created`);

    // ─── Print Credentials ─────────────────────────────────────────────────────
    console.log('\n📋 ═══════════════════════════════════════════');
    console.log('   SAMPLE LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    console.log('🔴 ADMIN    | admin@attendance.com    | admin123');
    console.log('📘 TEACHER  | rajesh@college.edu      | teacher123');
    console.log('📘 TEACHER  | anitha@college.edu      | teacher123');
    console.log('🟢 STUDENT  | arjun@student.edu       | student123');
    console.log('🟢 STUDENT  | priya@student.edu       | student123');
    console.log('🟢 STUDENT  | ravi@student.edu        | student123');
    console.log('═══════════════════════════════════════════\n');
    console.log('✅ Database seeding complete!');

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

seedDatabase();
