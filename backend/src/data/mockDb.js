const users = [];

const sessions = [
  {
    id: "s-1",
    teacher_id: "mock-teacher",
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
