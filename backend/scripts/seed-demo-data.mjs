/**
 * Seed rich demo data for Peak Academy test accounts.
 * Prerequisite: npm run seed:auth (creates admin/teacher/student/parent users)
 *
 * Usage (from backend/):
 *   npm run seed:demo
 */
import { createClient } from "@supabase/supabase-js";
import { loadSeedEnv } from "./load-seed-env.mjs";
import { randomUUID } from "crypto";
import { buildLinkCode } from "../src/utils/ensure-user-profile.js";

const EMAILS = {
  teacher: "teacher@peak.com",
  student: "student@peak.com",
  parent: "parent@peak.com"
};

const DEMO = {
  sessionScheduled: "a1000001-0000-4000-8000-000000000001",
  sessionCompleted: "a1000002-0000-4000-8000-000000000002",
  enrollmentScheduled: "demo-enr-scheduled",
  enrollmentCompleted: "demo-enr-completed",
  roomMath: "demo-room-math-third",
  roomPhysics: "demo-room-physics-third",
  memberStudentMath: "demo-member-student-math",
  questionOpen: "demo-question-open",
  questionAnswered: "demo-question-answered",
  withdrawal: "demo-withdrawal-001",
  promotionCode: "DEMO20"
};

const { url, serviceKey } = loadSeedEnv();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function log(step, detail = "") {
  console.log(detail ? `  ✓ ${step}: ${detail}` : `  ✓ ${step}`);
}

function warn(step, detail) {
  console.warn(`  ⚠ ${step}: ${detail}`);
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days) {
  return daysFromNow(-days);
}

async function getUserIdByEmail(email) {
  const { data, error } = await supabase.from("users").select("id, role").eq("email", email).maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertRow(table, row, onConflict) {
  const { error } = await supabase.from(table).upsert(row, { onConflict });
  if (error) throw error;
}

async function upsertTeacherProfile(teacherId) {
  await upsertRow(
    "teacher_profiles",
    {
      user_id: teacherId,
      subjects: ["math", "physics", "chemistry"],
      bio: "مدرس تجريبي متخصص في الرياضيات والفيزياء والكيمياء — بيانات للتجربة على المنصة.",
      grades: ["sec_second", "sec_third"],
      experience_years: 8,
      education: "بكالوريوس علوم — جامعة القاهرة",
      social_url: "https://www.youtube.com/",
      commission_rate: 70,
      rating: 4.8,
      review_count: 6
    },
    "user_id"
  );
  log("teacher profile", "math, physics, chemistry");
}

async function upsertStudentProfile(studentId) {
  const linkCode = buildLinkCode(studentId);
  const payload = {
    user_id: studentId,
    grade: "third",
    section: "أ",
    link_code: linkCode,
    streak_days: 5
  };

  const { error } = await supabase.from("student_profiles").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
  log("student profile", `grade third, link_code ${linkCode}`);
  return linkCode;
}

async function linkParentToStudent(parentId, studentUserId) {
  const { data: studentProfile, error: findErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", studentUserId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!studentProfile?.id) throw new Error("student profile row missing");

  const { error: updateErr } = await supabase
    .from("student_profiles")
    .update({ parent_id: parentId })
    .eq("user_id", studentUserId);
  if (updateErr) throw updateErr;

  const parentLinkTables = ["parent_children", "parent_links"];
  for (const table of parentLinkTables) {
    const { error } = await supabase
      .from(table)
      .upsert({ parent_id: parentId, student_id: studentUserId }, { onConflict: "parent_id,student_id" });
    if (!error) log("parent link", table);
    else warn("parent link", `${table}: ${error.message}`);
  }
}

async function seedStudentTrial(studentId) {
  await supabase.from("student_subscriptions").delete().eq("student_id", studentId);

  const trialEnd = daysFromNow(30);
  const now = new Date().toISOString();
  const { error } = await supabase.from("student_subscriptions").insert({
    student_id: studentId,
    plan_id: null,
    status: "trialing",
    sessions_remaining: 0,
    current_period_start: now,
    current_period_end: trialEnd,
    trial_start: now,
    trial_end: trialEnd
  });
  if (error) throw error;
  log("student trial", "30-day study room access");
}

async function seedStudyRooms(teacherId, studentId) {
  const rooms = [
    {
      id: DEMO.roomMath,
      subject: "math",
      grade: "third",
      status: "active",
      capacity: 6,
      teacher_id: teacherId
    },
    {
      id: DEMO.roomPhysics,
      subject: "physics",
      grade: "third",
      status: "open",
      capacity: 6,
      teacher_id: teacherId
    }
  ];

  for (const room of rooms) {
    await upsertRow("study_rooms", room, "id");
  }
  log("study rooms", "math (active) + physics (open)");

  await upsertRow(
    "study_room_members",
    {
      id: DEMO.memberStudentMath,
      room_id: DEMO.roomMath,
      user_id: studentId,
      role: "student",
      joined_at: daysAgo(1),
      left_at: null
    },
    "id"
  );
  log("study room member", "student in math room");

  const messages = [
    {
      id: randomUUID(),
      room_id: DEMO.roomMath,
      sender_id: studentId,
      channel: "general",
      type: "text",
      content: "السلام عليكم — حد عنده سؤال في التفاضل؟"
    },
    {
      id: randomUUID(),
      room_id: DEMO.roomMath,
      sender_id: studentId,
      channel: "qa",
      type: "question",
      content: "إزاي أحسب مشتقة الدالة x² + 3x؟"
    }
  ];

  for (const msg of messages) {
    const { error } = await supabase.from("study_room_messages").upsert(msg, { onConflict: "id" });
    if (!error) continue;
    warn("study room message", error.message);
  }
}

async function seedSessions(teacherId, studentId) {
  const price = 120;
  const scheduledAt = daysFromNow(3);
  const completedAt = daysAgo(7);

  const baseSessions = [
    {
      id: DEMO.sessionScheduled,
      teacher_id: teacherId,
      title: "مراجعة تفاضل — تالتة ثانوي",
      subject: "math",
      grade: "sec_third",
      school_level: "secondary",
      scheduled_at: scheduledAt,
      duration_min: 60,
      max_students: 10,
      price_per_student: price,
      status: "scheduled",
      description: "جلسة تجريبية قادمة لمراجعة وحدة التفاضل."
    },
    {
      id: DEMO.sessionCompleted,
      teacher_id: teacherId,
      title: "فيزياء — قوانين نيوتن",
      subject: "physics",
      grade: "sec_third",
      school_level: "secondary",
      scheduled_at: completedAt,
      duration_min: 90,
      max_students: 8,
      price_per_student: price,
      status: "completed",
      description: "جلسة تجريبية مكتملة للتجربة على التقارير والأرباح."
    }
  ];

  for (const session of baseSessions) {
    const variants = [
      { ...session, start_time: session.scheduled_at, price, duration_minutes: session.duration_min },
      session
    ];
    let saved = false;
    for (const row of variants) {
      const { error } = await supabase.from("sessions").upsert(row, { onConflict: "id" });
      if (!error) {
        saved = true;
        break;
      }
    }
    if (!saved) warn("session", session.title);
  }
  log("sessions", "1 scheduled + 1 completed");

  const enrollments = [
    {
      id: DEMO.enrollmentScheduled,
      session_id: DEMO.sessionScheduled,
      student_id: studentId,
      status: "confirmed",
      created_at: daysAgo(1)
    },
    {
      id: DEMO.enrollmentCompleted,
      session_id: DEMO.sessionCompleted,
      student_id: studentId,
      status: "attended",
      created_at: daysAgo(8)
    }
  ];

  for (const enrollment of enrollments) {
    const variants = [
      enrollment,
      { ...enrollment, status: enrollment.status === "confirmed" ? "enrolled" : "attended" }
    ];
    for (const row of variants) {
      const { error } = await supabase.from("enrollments").upsert(row, { onConflict: "id" });
      if (!error) break;
    }
  }
  log("enrollments", "student enrolled in both sessions");
}

async function seedQuestions(teacherId, studentId) {
  const questions = [
    {
      id: DEMO.questionOpen,
      student_id: studentId,
      teacher_id: null,
      subject: "math",
      content: "ممكن حد يشرحلي قاعدة لوبيتال؟",
      status: "unanswered",
      created_at: daysAgo(2)
    },
    {
      id: DEMO.questionAnswered,
      student_id: studentId,
      teacher_id: teacherId,
      subject: "physics",
      content: "إيه الفرق بين السرعة والتسارع؟",
      answer: "السرعة معدل تغير المسافة، والتسارع معدل تغير السرعة.",
      status: "answered",
      created_at: daysAgo(5),
      answered_at: daysAgo(4)
    }
  ];

  for (const q of questions) {
    await upsertRow("questions", q, "id");
  }
  log("questions", "1 open + 1 answered");
}

async function seedWithdrawal(teacherId) {
  await upsertRow(
    "withdrawals",
    {
      id: DEMO.withdrawal,
      teacher_id: teacherId,
      amount: 450,
      method: "vodafone_cash",
      notes: "طلب سحب تجريبي",
      status: "pending",
      created_at: daysAgo(2)
    },
    "id"
  );
  log("withdrawal", "pending 450 EGP");
}

async function seedPromotion(adminId) {
  const promo = {
    code: DEMO.promotionCode,
    type: "coupon",
    discount_type: "percent",
    discount_value: 20,
    min_sessions: 1,
    bonus_sessions: 0,
    max_uses: 100,
    used_count: 3,
    per_user_limit: 1,
    applies_to: "all",
    expires_at: daysFromNow(90),
    is_active: true,
    created_by: adminId || null
  };

  const { error } = await supabase.from("promotions").upsert(promo, { onConflict: "code" });
  if (error) warn("promotion", error.message);
  else log("promotion", `${DEMO.promotionCode} (20% off)`);
}

async function main() {
  console.log("\nSeeding Peak Academy demo data...\n");

  const teacher = await getUserIdByEmail(EMAILS.teacher);
  const student = await getUserIdByEmail(EMAILS.student);
  const parent = await getUserIdByEmail(EMAILS.parent);
  const admin = await getUserIdByEmail("admin@peak.com");

  if (!teacher?.id || !student?.id || !parent?.id) {
    console.error("Missing test users. Run first: npm run seed:auth");
    process.exit(1);
  }

  await upsertTeacherProfile(teacher.id);
  const linkCode = await upsertStudentProfile(student.id);
  await linkParentToStudent(parent.id, student.id);
  await seedStudentTrial(student.id);
  await seedStudyRooms(teacher.id, student.id);
  await seedSessions(teacher.id, student.id);
  await seedQuestions(teacher.id, student.id);
  await seedWithdrawal(teacher.id);
  await seedPromotion(admin?.id);

  console.log("\nDemo data ready.\n");
  console.log("Accounts (from docs/Accounts.md):");
  console.log("  teacher@peak.com / Teacher123!");
  console.log("  student@peak.com / Student123!");
  console.log("  parent@peak.com  / Parent123!");
  console.log("  admin@peak.com   / Admin123!");
  console.log("\nHighlights:");
  console.log(`  • Teacher subjects: math, physics, chemistry`);
  console.log(`  • Study rooms: ${DEMO.roomMath} (active), ${DEMO.roomPhysics} (open)`);
  console.log(`  • Student trial: 30 days study room access`);
  console.log(`  • Parent linked to student (link code: ${linkCode})`);
  console.log(`  • Sessions: upcoming + completed with enrollments`);
  console.log(`  • Questions: 1 unanswered, 1 answered`);
  console.log(`  • Withdrawal pending + promo code ${DEMO.promotionCode}`);
  console.log("");
}

main().catch((err) => {
  console.error("\nSeed failed:", err?.message || err);
  process.exit(1);
});
