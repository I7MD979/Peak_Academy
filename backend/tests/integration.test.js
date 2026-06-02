process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../src/app");

const teacherHeader = { "x-test-user": JSON.stringify({ id: "u-teacher", email: "teacher@peak.com", role: "teacher", full_name: "Teacher" }) };
const studentHeader = { "x-test-user": JSON.stringify({ id: "u-student", email: "student@peak.com", role: "student", full_name: "Student" }) };
const parentHeader = { "x-test-user": JSON.stringify({ id: "u-parent", email: "parent@peak.com", role: "parent", full_name: "Parent" }) };
const adminHeader = { "x-test-user": JSON.stringify({ id: "u-admin", email: "admin@peak.com", role: "admin", full_name: "Admin" }) };

describe("Peak Academy integration", () => {
  test("auth endpoints validate payloads", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({ email: "bad" });
    expect(registerRes.statusCode).toBe(400);

    const loginRes = await request(app).post("/api/auth/login").send({ email: "x" });
    expect(loginRes.statusCode).toBe(400);
  });

  test("sessions flow creates and enrolls", async () => {
    const createRes = await request(app)
      .post("/api/sessions")
      .set(teacherHeader)
      .send({
        title: "Functions Revision",
        subject: "math",
        grade: "third",
        scheduled_at: new Date(Date.now() + 3600000).toISOString(),
        price_per_student: 100,
        duration_min: 60,
        max_students: 10
      });
    expect(createRes.statusCode).toBe(200);
    const sessionId = createRes.body.data.id;

    const enrollRes = await request(app).post(`/api/sessions/${sessionId}/enroll`).set(studentHeader).send({});
    expect(enrollRes.statusCode).toBe(200);
    expect(enrollRes.body.data.enrollment.session_id).toBe(sessionId);
  });

  test("payments flow initiate and history", async () => {
    const initRes = await request(app).post("/api/payment/initiate").set(studentHeader).send({ type: "subscription", amount: 150 });
    expect(initRes.statusCode).toBe(200);
    expect(initRes.body.data.transaction.status).toBe("pending");

    const historyRes = await request(app).get("/api/payment/history").set(studentHeader);
    expect(historyRes.statusCode).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThan(0);
  });

  test("medium priority routes are operational", async () => {
    const roomRes = await request(app).post("/api/study-rooms/join-random").set(studentHeader).send({ subject: "math", grade: "third" });
    expect(roomRes.statusCode).toBe(200);

    const subscriptionRes = await request(app)
      .post("/api/reports/parent/weekly-email-subscriptions")
      .set(parentHeader)
      .send({ student_id: "u-student", enabled: true, day_of_week: 0, hour_utc: 7 });
    expect(subscriptionRes.statusCode).toBe(200);

    const notifyRes = await request(app)
      .post("/api/notifications")
      .set(adminHeader)
      .send({ user_id: "u-student", type: "info", title: "Test", body: "Hello" });
    expect(notifyRes.statusCode).toBe(200);

    const listNotificationsRes = await request(app).get("/api/notifications").set(studentHeader);
    expect(listNotificationsRes.statusCode).toBe(200);
    expect(listNotificationsRes.body.data.length).toBeGreaterThan(0);

    const reviewRes = await request(app)
      .post("/api/reviews")
      .set(studentHeader)
      .send({ teacher_id: "u-teacher", rating: 5, comment: "Excellent explanation" });
    expect(reviewRes.statusCode).toBe(200);
  });

  test("growth phase routes are operational", async () => {
    const pricingRes = await request(app)
      .post("/api/marketplace/pricing")
      .set(adminHeader)
      .send({ subject: "math", grade: "third", amount: 25 });
    expect(pricingRes.statusCode).toBe(200);

    const routeRes = await request(app)
      .post("/api/marketplace/route-question")
      .set(studentHeader)
      .send({ teacher_id: "u-teacher" });
    expect(routeRes.statusCode).toBe(200);

    const quizRes = await request(app).post("/api/quizzes").set(teacherHeader).send({ title: "Limits Quiz", subject: "math" });
    expect(quizRes.statusCode).toBe(200);
    const quizId = quizRes.body.data.id;

    const quizQuestionRes = await request(app)
      .post(`/api/quizzes/${quizId}/questions`)
      .set(teacherHeader)
      .send({ prompt: "2+2?", options: ["3", "4"], correct_option: "4" });
    expect(quizQuestionRes.statusCode).toBe(200);

    const submitRes = await request(app).post(`/api/quizzes/${quizId}/submit`).set(studentHeader).send({ answers: { [quizQuestionRes.body.data.id]: "4" } });
    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.body.data.score).toBe(1);

    const recordingRes = await request(app)
      .post("/api/recordings")
      .set(teacherHeader)
      .send({ session_id: "s-1", storage_url: "https://cdn.example.com/rec.mp4", visibility: "public" });
    expect(recordingRes.statusCode).toBe(200);
  });
});
