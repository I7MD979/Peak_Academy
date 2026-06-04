const bcrypt = require("bcryptjs");

const users = [
  { id: "u-admin", email: "admin@peak.com", full_name: "Admin User", phone: "01000000000", role: "admin", password_hash: bcrypt.hashSync("Admin123!", 10) },
  { id: "u-teacher", email: "teacher@peak.com", full_name: "Teacher User", phone: "01000000001", role: "teacher", password_hash: bcrypt.hashSync("Teacher123!", 10) },
  { id: "u-student", email: "student@peak.com", full_name: "Student User", phone: "01000000002", role: "student", password_hash: bcrypt.hashSync("Student123!", 10) },
  { id: "u-parent", email: "parent@peak.com", full_name: "Parent User", phone: "01000000003", role: "parent", password_hash: bcrypt.hashSync("Parent123!", 10) }
];

const sessions = [
  {
    id: "s-1",
    teacher_id: "u-teacher",
    subject: "math",
    title: "Limits and Continuity",
    grade: "third",
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    duration_min: 60,
    max_students: 10,
    price_per_student: 70,
    status: "scheduled"
  }
];

const enrollments = [];
const transactions = [];
const questions = [];

module.exports = { users, sessions, enrollments, transactions, questions };
