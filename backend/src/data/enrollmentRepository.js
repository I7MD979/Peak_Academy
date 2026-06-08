import { supabase } from "../lib/supabase.js";
import { isSchemaV2, SCHEMA, sessionPrice, sessionSelectFields } from "../lib/schema.js";
import { invalidateSessionCaches, invalidateStudentCaches } from "../lib/cache.js";

export async function fetchSessionForEnroll(sessionId) {
  const { data: session, error } = await supabase
    .from("sessions")
    .select(sessionSelectFields())
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  if (isSchemaV2() && session.current_students != null && session.max_students != null) {
    const enrolled = session.current_students || 0;
    return {
      ...session,
      price_per_student: sessionPrice(session),
      scheduled_at: session.start_time,
      enrolled_count: enrolled,
      seats_left: Math.max(0, session.max_students - enrolled)
    };
  }

  const { count: enrolledCount } = await supabase
    .from(SCHEMA.enrollmentsTable())
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", SCHEMA.confirmedEnrollmentStatuses());

  const enrolled = enrolledCount || 0;
  return {
    ...session,
    price_per_student: sessionPrice(session),
    scheduled_at: session.start_time ?? session.scheduled_at,
    enrolled_count: enrolled,
    seats_left: Math.max(0, (session.max_students || 0) - enrolled)
  };
}

export async function findEnrollmentByStudentAndSession(studentKey, sessionId, { userId } = {}) {
  if (isSchemaV2()) {
    const sid = userId || studentKey;
    const { data } = await supabase
      .from("enrollments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("student_id", sid)
      .maybeSingle();
    return data;
  }
  const { data } = await supabase
    .from("session_enrollments")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", studentKey)
    .maybeSingle();
  return data;
}

export async function countConfirmedEnrollments(sessionId) {
  if (isSchemaV2()) {
    const { data: session } = await supabase
      .from("sessions")
      .select("current_students, max_students")
      .eq("id", sessionId)
      .maybeSingle();
    return {
      count: session?.current_students ?? 0,
      max: session?.max_students ?? 0
    };
  }
  const { count } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", SCHEMA.confirmedEnrollmentStatuses());
  const { data: session } = await supabase
    .from("sessions")
    .select("max_students")
    .eq("id", sessionId)
    .maybeSingle();
  return { count: count || 0, max: session?.max_students ?? 0 };
}

export async function insertEnrollment({
  userId,
  studentProfileId,
  sessionId,
  paymentId = null,
  enrollmentId = null,
  status,
  paymentStatus
}) {
  if (isSchemaV2()) {
    const { count: enrolled, max } = await countConfirmedEnrollments(sessionId);
    if (max > 0 && enrolled >= max) {
      throw Object.assign(new Error("الحصة ممتلئة"), { code: "session_full" });
    }

    const row = {
      student_id: userId,
      session_id: sessionId,
      status: status || "pending",
      payment_status: paymentStatus || (status === "confirmed" ? "paid" : "pending")
    };
    if (enrollmentId) row.id = enrollmentId;

    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;

    if (row.status === "confirmed") {
      await supabase.rpc("increment_session_count", { p_session_id: sessionId });
    }
    await invalidateSessionCaches(sessionId);
    await invalidateStudentCaches(userId);
    return enrollment;
  }

  const id = enrollmentId || `en-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

export async function confirmEnrollmentV2(userId, sessionId, existingEnrollment = null) {
  if (existingEnrollment?.status === "confirmed") return existingEnrollment;

  const { count: enrolled, max } = await countConfirmedEnrollments(sessionId);
  if (max > 0 && enrolled >= max) {
    throw Object.assign(new Error("الحصة ممتلئة"), { code: "session_full" });
  }

  if (existingEnrollment) {
    const { data, error } = await supabase
      .from("enrollments")
      .update({ status: "confirmed", payment_status: "paid" })
      .eq("id", existingEnrollment.id)
      .select("*")
      .single();
    if (error) throw error;
    await supabase.rpc("increment_session_count", { p_session_id: sessionId });
    await invalidateSessionCaches(sessionId);
    await invalidateStudentCaches(userId);
    return data;
  }

  return insertEnrollment({
    userId,
    sessionId,
    status: "confirmed",
    paymentStatus: "paid"
  });
}

export async function createSessionPayment({
  userId,
  enrollmentId,
  finalPrice,
  originalPrice,
  discountAmount,
  promotionId,
  paymobOrderId,
  legacyTransactionId
}) {
  if (isSchemaV2()) {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        enrollment_id: enrollmentId,
        student_id: userId,
        amount: finalPrice,
        original_amount: originalPrice,
        discount_amount: discountAmount,
        platform_fee: round2(finalPrice * 0.3),
        teacher_earning: round2(finalPrice * 0.7),
        paymob_order_id: String(paymobOrderId),
        promotion_id: promotionId,
        status: "pending"
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { error } = await supabase.from("transactions").insert({
    id: legacyTransactionId,
    user_id: userId,
    type: "session_payment",
    amount: finalPrice,
    original_amount: originalPrice,
    discount_amount: discountAmount,
    promotion_id: promotionId,
    paymob_order_id: paymobOrderId,
    status: "pending",
    metadata: { session_id: null, enrollment_id: enrollmentId }
  });
  if (error) throw error;
  return { id: legacyTransactionId };
}

export async function findPaymentByPaymobOrder(orderId) {
  const { findPaymentByReference, findLegacyTransactionByReference } = await import(
    "../utils/payment-lookup.js"
  );
  const payment = await findPaymentByReference(orderId);
  if (payment) return payment;

  if (!isSchemaV2()) {
    const transaction = await findLegacyTransactionByReference(orderId);
    return transaction ? { _legacyTransaction: transaction } : null;
  }
  return null;
}

export async function fulfillPayment(payment, paymobTxnId) {
  if (isSchemaV2()) {
    if (!payment || payment.status !== "pending") {
      return { ok: payment?.status === "paid", duplicate: payment?.status === "paid" };
    }

    const enrollment = payment.enrollment;
    if (!enrollment) return { enrolled: false };
    if (enrollment.status === "confirmed") {
      return { enrolled: true, duplicate: true };
    }

    await Promise.all([
      supabase
        .from("payments")
        .update({
          status: "paid",
          paymob_transaction_id: String(paymobTxnId),
          paid_at: new Date().toISOString()
        })
        .eq("id", payment.id),
      supabase
        .from("enrollments")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("id", enrollment.id),
      supabase.rpc("increment_session_count", { p_session_id: enrollment.session_id })
    ]);

    await invalidateSessionCaches(enrollment.session_id);
    await invalidateStudentCaches(enrollment.student_id);
    return { enrolled: true, enrollment, payment };
  }
  return null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
