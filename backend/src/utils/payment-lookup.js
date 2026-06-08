import { supabase } from "../lib/supabase.js";

const PAYMENT_SELECT = "*";

/**
 * Resolve a payment row by internal id, Paymob order id, or provider order id.
 */
export async function findPaymentByReference(referenceId, { provider } = {}) {
  const id = String(referenceId || "").trim();
  if (!id) return null;

  let query = supabase.from("payments").select(PAYMENT_SELECT).eq("id", id);
  if (provider) query = query.eq("provider", provider);
  let { data: payment } = await query.maybeSingle();
  if (payment) return payment;

  query = supabase.from("payments").select(PAYMENT_SELECT).eq("provider_order_id", id);
  if (provider) query = query.eq("provider", provider);
  ({ data: payment } = await query.maybeSingle());
  if (payment) return payment;

  query = supabase.from("payments").select(PAYMENT_SELECT).eq("paymob_order_id", id);
  if (provider) query = query.eq("provider", provider);
  ({ data: payment } = await query.maybeSingle());
  return payment || null;
}

/** Payment owned by the authenticated student (BOLA-safe). */
export async function findPaymentForStudent(paymentId, userId) {
  const payment = await findPaymentByReference(paymentId);
  if (!payment) return null;
  if (payment.student_id !== userId) return null;
  return payment;
}

export async function findLegacyTransactionByReference(referenceId) {
  const id = String(referenceId || "").trim();
  if (!id) return null;

  let { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (transaction) return transaction;

  ({ data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("paymob_order_id", id)
    .maybeSingle());

  return transaction || null;
}
