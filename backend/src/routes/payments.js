import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { createPaymobOrder } from "../services/paymob.service.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { verifyPaymobHmac } from "../utils/paymob-hmac.js";
import { fulfillCompletedTransaction } from "../utils/payments-fulfillment.js";

const router = Router();

router.post("/initiate", auth, async (req, res) => {
  try {
    const { amount, session_id, type = "session_payment", subject, content, grade } = req.body;
    if (!amount || Number(amount) <= 0) {
      return error(res, "المبلغ غير صالح", 400);
    }
    if (type === "session_payment" && !session_id) {
      return error(res, "معرّف الجلسة مطلوب للدفع", 400);
    }
    if (type === "question_payment") {
      if (!subject || !content || String(content).trim().length < 10) {
        return error(res, "المادة ونص السؤال مطلوبان قبل الدفع", 400);
      }
    }

    let metadata = { session_id: session_id || null };
    if (type === "question_payment") {
      const studentGrade =
        grade ||
        (
          await supabase.from("student_profiles").select("grade").eq("user_id", req.user.id).single()
        ).data?.grade;
      metadata = {
        subject,
        content: String(content).trim(),
        grade: studentGrade || null
      };
    }

    const amountCents = Math.round(Number(amount) * 100);
    const { checkoutUrl, orderId } = await createPaymobOrder(amountCents, req.user);
    const { error: insertError } = await supabase.from("transactions").insert({
      id: `tx-${Date.now()}`,
      user_id: req.user.id,
      type,
      amount: Number(amount),
      paymob_order_id: orderId,
      status: "pending",
      metadata
    });
    if (insertError) throw insertError;

    return success(res, { checkout_url: checkoutUrl, order_id: orderId });
  } catch (err) {
    return error(res, err.message || "Failed to initiate payment", 500);
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const hmac = req.query.hmac;
    const obj = req.body?.obj;

    if (!verifyPaymobHmac(obj, hmac)) {
      return res.status(401).json({ error: "Invalid HMAC" });
    }

    if (!obj?.success) {
      return res.status(200).json({ received: true, processed: false });
    }

    const orderId = String(obj.order?.id ?? "");
    const paymobTxnId = String(obj.id ?? "");

    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("paymob_order_id", orderId)
      .maybeSingle();

    if (!transaction) {
      return res.status(200).json({ received: true, processed: false });
    }

    await fulfillCompletedTransaction(transaction, paymobTxnId);
    return res.status(200).json({ received: true, processed: true });
  } catch (_err) {
    return res.status(500).json({ error: "Webhook error" });
  }
});

router.get("/history", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { from, to } = paginate(page, limit);
    const { data, count } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    return paginated(res, data, paginationMeta(count, Number(page), Number(limit)));
  } catch (_err) {
    return error(res, "Failed to fetch history", 500);
  }
});

export default router;
