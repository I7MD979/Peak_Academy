import { supabase } from "../lib/supabase.js";
import { reconcileCompletedTransaction } from "./payments-fulfillment.js";

/**
 * Resolves whether a payment has fulfilled (enrollment / question) for polling & enroll.
 */
export async function resolveTransactionFulfillment(transaction, userId) {
  if (!transaction) {
    return { enrolled: false, question_created: false };
  }

  if (transaction.status === "completed") {
    const result = await reconcileCompletedTransaction(transaction);
    return {
      enrolled: Boolean(result.enrolled),
      question_created: Boolean(result.question_created)
    };
  }

  if (transaction.type === "session_payment") {
    const sessionId = transaction.metadata?.session_id;
    if (!sessionId) return { enrolled: false, question_created: false };

    const { data: student } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!student?.id) return { enrolled: false, question_created: false };

    const { data: enrollment } = await supabase
      .from("session_enrollments")
      .select("id")
      .eq("session_id", sessionId)
      .eq("student_id", student.id)
      .maybeSingle();

    return { enrolled: Boolean(enrollment), question_created: false };
  }

  if (transaction.type === "question_payment") {
    const { data: question } = await supabase
      .from("questions")
      .select("id")
      .eq("id", `q-${transaction.id}`)
      .maybeSingle();

    return { enrolled: false, question_created: Boolean(question) };
  }

  return { enrolled: false, question_created: false };
}
