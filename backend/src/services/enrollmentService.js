import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { validatePromoCode, applyPromoToPrice, recordPromoUse } from "../utils/promoValidator.js";
import { createPaymobOrder } from "./paymob.service.js";
import { isSchemaV2, mapCheckoutResponse } from "../lib/schema.js";
import { getSessionPrice as getPlatformSessionPrice } from "./platformConfig.service.js";
import {
  fetchSessionForEnroll,
  findEnrollmentByStudentAndSession,
  insertEnrollment,
  confirmEnrollmentV2,
  createSessionPayment
} from "../data/enrollmentRepository.js";

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
  return fetchSessionForEnroll(sessionId);
}

export async function getStudentProfileId(userId) {
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return student?.id || null;
}

export async function checkExistingEnrollment(studentProfileId, sessionId, userId) {
  return findEnrollmentByStudentAndSession(studentProfileId, sessionId, { userId });
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

export async function notifyEnrollmentConfirm(userId, sessionId, amountPaid) {
  const [{ data: user }, { data: session }] = await Promise.all([
    supabase.from("users").select("email, full_name").eq("id", userId).maybeSingle(),
    supabase
      .from("sessions")
      .select("title, scheduled_at, start_time, teacher_id")
      .eq("id", sessionId)
      .maybeSingle()
  ]);

  const paidAmount = Number(amountPaid) || 0;
  const jobs = [
    enqueueJob("email", "enrollment-confirm", {
      studentEmail: user?.email,
      studentName: user?.full_name,
      sessionTitle: session?.title,
      startTime: session?.start_time ?? session?.scheduled_at,
      amountPaid: paidAmount,
      isFree: paidAmount <= 0
    }),
    enqueueJob("notifications", "push-notification", {
      userId,
      type: "enrollment",
      title: "تم تأكيد التسجيل",
      body: `تم تأكيد تسجيلك في ${session?.title || "الحصة"}`,
      data: { session_id: sessionId }
    })
  ];

  if (session?.teacher_id) {
    jobs.push(
      enqueueJob("notifications", "push-notification", {
        userId: session.teacher_id,
        type: "enrollment",
        title: "طالب جديد سجل في حصتك",
        body: `${user?.full_name || "طالب"} سجل في ${session?.title || "الحصة"}`,
        data: { session_id: sessionId, student_id: userId }
      })
    );
  }

  await Promise.all(jobs);
}

export async function confirmEnrollment({
  studentProfileId,
  sessionId,
  paymentId = null,
  enrollmentId = null,
  userId
}) {
  if (isSchemaV2()) {
    return confirmEnrollmentV2(userId, sessionId);
  }

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
  const { invalidateSessionCaches } = await import("../lib/cache.js");
  await invalidateSessionCaches(sessionId);
  return enrollment;
}

export async function computeSessionCheckout(session, { promoCode, userId, paymentType }) {
  const originalPrice = await getPlatformSessionPrice();
  let discountAmount = 0;
  let finalPrice = originalPrice;
  let promotionId = null;
  let promo = null;
  const pType = paymentType === "per_session" ? "pay_per_session" : paymentType || "pay_per_session";

  if (promoCode && originalPrice > 0) {
    const validation = await validatePromoCode(promoCode, userId, pType);
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
  frontendUrl,
  studentProfileId: _studentProfileId
}) {
  const amountCents = Math.round(finalPrice * 100);
  const returnUrl = `${frontendUrl}/student/sessions/${session.id}`;
  const { checkoutUrl, orderId } = await createPaymobOrder(amountCents, user, { returnUrl });

  if (isSchemaV2()) {
    const pending = await insertEnrollment({
      userId: user.id,
      sessionId: session.id,
      status: "pending",
      paymentStatus: "pending"
    });
    await createSessionPayment({
      userId: user.id,
      enrollmentId: pending.id,
      finalPrice,
      originalPrice,
      discountAmount,
      promotionId,
      paymobOrderId: orderId
    });
    return mapCheckoutResponse({
      checkout_url: checkoutUrl,
      paymob_url: checkoutUrl,
      enrollment: pending,
      order_id: orderId
    });
  }

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

  return mapCheckoutResponse({
    checkout_url: checkoutUrl,
    paymob_url: checkoutUrl,
    transaction_id: transactionId,
    order_id: orderId
  });
}

export async function getEnrollmentOptionsForSession(userId, session) {
  const subjectId = await resolveSessionSubjectId(session);
  const trialUsed = subjectId
    ? await checkFreeTrialUsed(userId, session.teacher_id, subjectId)
    : true;
  const subscription = await getActiveSubscription(userId);
  const seatsLeft = session.seats_left ?? Math.max(0, (session.max_students || 0) - (session.enrolled_count || 0));
  const price = await getPlatformSessionPrice();

  return {
    free_trial_available: Boolean(subjectId) && !trialUsed && price > 0,
    used: trialUsed,
    active_subscription: subscription
      ? {
          id: subscription.id,
          sessions_remaining: subscription.sessions_remaining,
          plan_name: subscription.plan?.name
        }
      : null,
    sessions_remaining: subscription?.sessions_remaining ?? 0,
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
  let enrollment;
  if (isSchemaV2()) {
    enrollment = await confirmEnrollmentV2(userId, session.id);
  } else {
    enrollment = await confirmEnrollment({
      studentProfileId,
      sessionId: session.id,
      enrollmentId,
      userId
    });
  }

  if (paymentType === "free_trial" && subjectId) {
    await recordFreeTrial(userId, session.teacher_id, subjectId, session.id);
  }

  if (promotionId) {
    const enrollId = isSchemaV2() ? enrollment.id : enrollment.id;
    await recordPromoUse(promotionId, userId, enrollId, discountAmount);
    if (isSchemaV2()) {
      await supabase.rpc("increment_used_count", { promo_id: promotionId });
    }
  }

  await notifyEnrollmentConfirm(userId, session.id, 0);
  return enrollment;
}

/** Normalize payment_type from master prompt */
export function normalizePaymentType(type) {
  if (!type) return "pay_per_session";
  if (type === "per_session") return "pay_per_session";
  return type;
}
