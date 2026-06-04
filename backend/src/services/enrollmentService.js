import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { invalidateSessionCaches } from "../lib/cache.js";
import { validatePromoCode, applyPromoToPrice, recordPromoUse } from "../utils/promoValidator.js";
import { createPaymobOrder } from "./paymob.service.js";

export async function resolveSessionSubjectId(session) {
  if (session.subject_id) return session.subject_id;
  if (!session.subject) return null;

  const { data: byName } = await supabase
    .from("subjects")
    .select("id")
    .eq("name_ar", session.subject)
    .maybeSingle();
  if (byName?.id) return byName.id;

  const { data: byEn } = await supabase
    .from("subjects")
    .select("id")
    .eq("name_en", session.subject)
    .maybeSingle();
  return byEn?.id || null;
}

export async function getSessionForEnroll(sessionId) {
  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, title, teacher_id, subject_id, subject, price_per_student, max_students, status, scheduled_at"
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const { count: enrolledCount } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", ["enrolled", "attended"]);

  return {
    ...session,
    enrolled_count: enrolledCount || 0,
    seats_left: Math.max(0, (session.max_students || 0) - (enrolledCount || 0))
  };
}

export async function getStudentProfileId(userId) {
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return student?.id || null;
}

export async function checkExistingEnrollment(studentProfileId, sessionId) {
  const { data } = await supabase
    .from("session_enrollments")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", studentProfileId)
    .maybeSingle();
  return data;
}

export async function checkFreeTrialUsed(studentUserId, teacherId, subjectId) {
  if (!subjectId) return true;
  const { data } = await supabase
    .from("free_trial_uses")
    .select("student_id")
    .eq("student_id", studentUserId)
    .eq("teacher_id", teacherId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  return Boolean(data);
}

export async function recordFreeTrial(studentUserId, teacherId, subjectId, sessionId) {
  const { error } = await supabase.from("free_trial_uses").insert({
    student_id: studentUserId,
    teacher_id: teacherId,
    subject_id: subjectId,
    session_id: sessionId
  });
  if (error) throw error;
}

export async function getActiveSubscription(studentUserId) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("student_subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("student_id", studentUserId)
    .eq("status", "active")
    .gt("sessions_remaining", 0)
    .gt("current_period_end", now)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function deductSubscriptionSession(subscriptionId) {
  const { data: sub } = await supabase
    .from("student_subscriptions")
    .select("sessions_remaining")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub || sub.sessions_remaining <= 0) {
    throw new Error("اشتراكك انتهت حصصه");
  }
  const { error } = await supabase
    .from("student_subscriptions")
    .update({ sessions_remaining: sub.sessions_remaining - 1 })
    .eq("id", subscriptionId);
  if (error) throw error;
}

export async function notifyEnrollmentConfirm(userId, sessionId) {
  const [{ data: user }, { data: session }] = await Promise.all([
    supabase.from("users").select("email, full_name").eq("id", userId).maybeSingle(),
    supabase.from("sessions").select("title, scheduled_at").eq("id", sessionId).maybeSingle()
  ]);

  await Promise.all([
    enqueueJob("email", "enrollment-confirm", {
      studentEmail: user?.email,
      studentName: user?.full_name,
      sessionTitle: session?.title,
      startTime: session?.scheduled_at
    }),
    enqueueJob("notifications", "push-notification", {
      userId,
      type: "enrollment",
      title: "تم تأكيد التسجيل",
      body: `تم تأكيد تسجيلك في ${session?.title || "الحصة"}`,
      data: { session_id: sessionId }
    })
  ]);
}

export async function confirmEnrollment({
  studentProfileId,
  sessionId,
  paymentId = null,
  enrollmentId = null
}) {
  const id = enrollmentId || `en-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: existing } = await supabase
    .from("session_enrollments")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", studentProfileId)
    .maybeSingle();

  if (existing) return existing;

  const { data: session } = await supabase
    .from("sessions")
    .select("max_students")
    .eq("id", sessionId)
    .maybeSingle();

  const { count: enrolledCount } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", ["enrolled", "attended"]);

  if (session && enrolledCount >= session.max_students) {
    throw Object.assign(new Error("الحصة ممتلئة"), { code: "session_full" });
  }

  const { data: enrollment, error } = await supabase
    .from("session_enrollments")
    .insert({
      id,
      session_id: sessionId,
      student_id: studentProfileId,
      payment_id: paymentId,
      status: "enrolled"
    })
    .select("*")
    .single();

  if (error) throw error;
  await invalidateSessionCaches(sessionId);
  return enrollment;
}

export async function computeSessionCheckout(session, { promoCode, userId, paymentType }) {
  const originalPrice = Number(session.price_per_student) || 0;
  let discountAmount = 0;
  let finalPrice = originalPrice;
  let promotionId = null;
  let promo = null;

  if (promoCode && originalPrice > 0) {
    const validation = await validatePromoCode(promoCode, userId, paymentType || "pay_per_session");
    if (!validation.valid) {
      return { error: validation.reason };
    }
    promo = validation;
    const applied = applyPromoToPrice(originalPrice, promo);
    discountAmount = applied.discountAmount;
    finalPrice = applied.finalPrice;
    promotionId = applied.promotionId;
  }

  return { originalPrice, discountAmount, finalPrice, promotionId, promo };
}

export async function createSessionPaymentCheckout({
  user,
  session,
  finalPrice,
  originalPrice,
  discountAmount,
  promotionId,
  frontendUrl
}) {
  const amountCents = Math.round(finalPrice * 100);
  const returnUrl = `${frontendUrl}/student/sessions/${session.id}`;
  const { checkoutUrl, orderId } = await createPaymobOrder(amountCents, user, { returnUrl });
  const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error: insertError } = await supabase.from("transactions").insert({
    id: transactionId,
    user_id: user.id,
    type: "session_payment",
    amount: finalPrice,
    original_amount: originalPrice,
    discount_amount: discountAmount,
    promotion_id: promotionId,
    paymob_order_id: orderId,
    status: "pending",
    metadata: { session_id: session.id }
  });
  if (insertError) throw insertError;

  return {
    checkout_url: checkoutUrl,
    transaction_id: transactionId,
    order_id: orderId
  };
}

export async function getEnrollmentOptionsForSession(userId, session) {
  const subjectId = await resolveSessionSubjectId(session);
  const trialUsed = subjectId
    ? await checkFreeTrialUsed(userId, session.teacher_id, subjectId)
    : true;
  const subscription = await getActiveSubscription(userId);
  const seatsLeft = session.seats_left ?? Math.max(0, (session.max_students || 0) - (session.enrolled_count || 0));

  return {
    free_trial_available: Boolean(subjectId) && !trialUsed && Number(session.price_per_student) > 0,
    active_subscription: subscription
      ? {
          id: subscription.id,
          sessions_remaining: subscription.sessions_remaining,
          plan_name: subscription.plan?.name
        }
      : null,
    seats_left: seatsLeft,
    low_seats: seatsLeft > 0 && seatsLeft <= 3
  };
}

export async function finalizeFreeOrPromoEnrollment({
  userId,
  studentProfileId,
  session,
  subjectId,
  paymentType,
  promotionId,
  discountAmount,
  enrollmentId
}) {
  const enrollment = await confirmEnrollment({
    studentProfileId,
    sessionId: session.id,
    enrollmentId
  });

  if (paymentType === "free_trial" && subjectId) {
    await recordFreeTrial(userId, session.teacher_id, subjectId, session.id);
  }

  if (promotionId) {
    await recordPromoUse(promotionId, userId, enrollment.id, discountAmount);
  }

  await notifyEnrollmentConfirm(userId, session.id);
  return enrollment;
}
