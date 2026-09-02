require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const addExtraStudents = async () => {
  await connectDB();
  console.log('🌱 Adding extra students...\n');

  try {
    const newStudents = await User.create([
      {
        name: 'Neha Sharma',
        email: 'neha@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021006',
        department: 'Computer Science',
        semester: 5,
      },
      {
        name: 'Rohit Verma',
        email: 'rohit@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021007',
        department: 'Computer Science',
        semester: 5,
      },
      {
        name: 'Simran Kaur',
        email: 'simran@student.edu',
        password: 'student123',
        role: 'student',
        rollNumber: 'CS2021008',
        department: 'Computer Science',
        semester: 5,
      },
    ]);
    console.log(`✅ ${newStudents.length} extra students created`);

    // Let's add them to the existing Computer Science classes
    const Class = require('../models/Class');
    const classes = await Class.find({ department: 'Computer Science' });
    for (let c of classes) {
      c.studentIds.push(...newStudents.map(s => s._id));
      await c.save();
    }
    console.log(`✅ Added new students to ${classes.length} classes`);

    console.log('\n📋 ═══════════════════════════════════════════');
    console.log('   NEW STUDENT CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    newStudents.forEach(s => {
      console.log(`🟢 STUDENT  | ${s.email.padEnd(23)} | student123`);
    });
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

addExtraStudents();
