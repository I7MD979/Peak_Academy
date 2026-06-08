const MOCK_HASH = "$2a$10$mock.hash.placeholder.for.dev.only";

const users = [
  { id: "u-admin", email: "admin@peak.com", full_name: "Admin User", phone: "01000000000", role: "admin", password_hash: MOCK_HASH },
  { id: "u-teacher", email: "teacher@peak.com", full_name: "Teacher User", phone: "01000000001", role: "teacher", password_hash: MOCK_HASH },
  { id: "u-student", email: "student@peak.com", full_name: "Student User", phone: "01000000002", role: "student", password_hash: MOCK_HASH },
  { id: "u-parent", email: "parent@peak.com", full_name: "Parent User", phone: "01000000003", role: "parent", password_hash: MOCK_HASH }
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

export { users, sessions, enrollments, transactions, questions };
