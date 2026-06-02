import { supabase } from "../lib/supabase.js";

export async function fulfillCompletedTransaction(transaction, paymobTxnId) {
  if (!transaction || transaction.status === "completed") {
    return { alreadyProcessed: true };
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      status: "completed",
      paymob_txn_id: paymobTxnId ? String(paymobTxnId) : transaction.paymob_txn_id
    })
    .eq("id", transaction.id)
    .eq("status", "pending");

  if (updateError) throw updateError;

  if (transaction.type === "question_payment") {
    const { subject, content } = transaction.metadata || {};
    if (!subject || !content) return { question_created: false };

    const { data: existing } = await supabase
      .from("questions")
      .select("id")
      .eq("student_id", transaction.user_id)
      .eq("content", content)
      .eq("subject", subject)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) return { question_created: true, duplicate: true };

    const { error: questionError } = await supabase.from("questions").insert({
      id: `q-${transaction.id}`,
      student_id: transaction.user_id,
      subject,
      content,
      status: "unanswered"
    });

    if (questionError) throw questionError;
    return { question_created: true };
  }

  const sessionId = transaction.metadata?.session_id;
  if (!sessionId || transaction.type !== "session_payment") {
    return { enrolled: false };
  }

  const { data: student } = await supabase.from("student_profiles").select("id").eq("user_id", transaction.user_id).single();
  if (!student) return { enrolled: false };

  const { count: enrolledCount } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", ["enrolled", "attended"]);

  const { data: session } = await supabase.from("sessions").select("max_students").eq("id", sessionId).single();
  if (session && enrolledCount >= session.max_students) {
    return { enrolled: false, reason: "session_full" };
  }

  const { data: existing } = await supabase
    .from("session_enrollments")
    .select("id")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existing) return { enrolled: true, duplicate: true };

  const { error: enrollError } = await supabase.from("session_enrollments").insert({
    id: `en-${transaction.id}`,
    session_id: sessionId,
    student_id: student.id,
    payment_id: transaction.id,
    status: "enrolled"
  });

  if (enrollError) throw enrollError;
  return { enrolled: true };
}
