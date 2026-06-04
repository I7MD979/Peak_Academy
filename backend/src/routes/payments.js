import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { createPaymobOrder } from "../services/paymob.service.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { verifyPaymobHmac } from "../utils/paymob-hmac.js";
import { handlePaymobWebhook } from "../utils/payments-fulfillment.js";
import { mapCheckoutResponse } from "../lib/schema.js";
import { resolveTransactionFulfillment } from "../utils/transaction-status.js";
import { validatePromoCode, calculateDiscount } from "../utils/promoValidator.js";
import { getSessionForEnroll, computeSessionCheckout } from "../services/enrollmentService.js";

const router = Router();

router.post("/validate-promo", auth, async (req, res) => {
  try {
    const { code, session_id, payment_type = "pay_per_session", plan_id } = req.body;
    if (!code) return error(res, "أدخل كود الخصم", 400);

    let originalPrice = 0;
    if (payment_type === "subscription" && plan_id) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("price")
        .eq("id", plan_id)
        .maybeSingle();
      originalPrice = Number(plan?.price || 0);
    } else if (session_id) {
      const session = await getSessionForEnroll(session_id);
      originalPrice = Number(session?.price_per_student || 0);
    }

    const validation = await validatePromoCode(code, req.user.id, payment_type);
    if (!validation.valid) {
      return success(res, { valid: false, reason: validation.reason });
    }

    const discountAmount = calculateDiscount(originalPrice, validation);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return success(res, {
      valid: true,
      promotion_id: validation.id,
      code: validation.code,
      discount_type: validation.discount_type,
      original_price: originalPrice,
      discount_amount: discountAmount,
      final_price: finalPrice
    });
  } catch (err) {
    return error(res, err.message || "فشل التحقق من الكود", 500);
  }
});

router.post("/initiate", auth, async (req, res) => {
  try {
    const { amount, session_id, type = "session_payment", subject, content, grade, promo_code } = req.body;

    if (type === "session_payment" && !session_id) {
      return error(res, "معرّف الجلسة مطلوب للدفع", 400);
    }
    if (type === "question_payment") {
      if (!subject || !content || String(content).trim().length < 10) {
        return error(res, "المادة ونص السؤال مطلوبان قبل الدفع", 400);
      }
    }

    let finalAmount = Number(amount);
    let originalAmount = finalAmount;
    let discountAmount = 0;
    let promotionId = null;

    if (type === "session_payment") {
      const session = await getSessionForEnroll(session_id);
      if (!session) return error(res, "الجلسة غير موجودة", 404);
      if (session.status !== "scheduled") {
        return error(res, "لا يمكن الدفع لجلسة غير متاحة للحجز", 400);
      }

      const checkout = await computeSessionCheckout(session, {
        promoCode: promo_code,
        userId: req.user.id,
        paymentType: "pay_per_session"
      });
      if (checkout.error) return error(res, checkout.error, 400);

      finalAmount = checkout.finalPrice;
      originalAmount = checkout.originalPrice;
      discountAmount = checkout.discountAmount;
      promotionId = checkout.promotionId;

      const { data: student } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", req.user.id)
        .maybeSingle();

      if (student?.id) {
        const { data: existing } = await supabase
          .from("session_enrollments")
          .select("id")
          .eq("session_id", session_id)
          .eq("student_id", student.id)
          .maybeSingle();

        if (existing) {
          return error(res, "أنت مسجّل في هذه الجلسة بالفعل", 400);
        }

        if (session.max_students > 0 && session.enrolled_count >= session.max_students) {
          return error(res, "اكتمل عدد مقاعد الجلسة", 400);
        }
      }
    } else if (!finalAmount || finalAmount <= 0) {
      return error(res, "المبلغ غير صالح", 400);
    }

    let metadata = { session_id: session_id || null };
    if (type === "question_payment") {
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("grade")
        .eq("user_id", req.user.id)
        .maybeSingle();
      const studentGrade = grade || studentProfile?.grade;
      metadata = {
        subject,
        content: String(content).trim(),
        grade: studentGrade || null
      };
    }

    const amountCents = Math.round(finalAmount * 100);
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    let returnUrl = `${frontendUrl}/student/sessions`;
    if (type === "session_payment" && session_id) {
      returnUrl = `${frontendUrl}/student/sessions/${session_id}`;
    } else if (type === "question_payment") {
      returnUrl = `${frontendUrl}/student/ask?paid=1`;
    }

    const { checkoutUrl, orderId } = await createPaymobOrder(amountCents, req.user, { returnUrl });
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error: insertError } = await supabase.from("transactions").insert({
      id: transactionId,
      user_id: req.user.id,
      type,
      amount: finalAmount,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      promotion_id: promotionId,
      paymob_order_id: orderId,
      status: "pending",
      metadata
    });
    if (insertError) throw insertError;

    return success(res, {
      checkout_url: checkoutUrl,
      order_id: orderId,
      transaction_id: transactionId,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount
    });
  } catch (err) {
    return error(res, err.message || "Failed to initiate payment", 500);
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const hmac = req.query.hmac;
    const obj = req.body?.obj;

    if (!verifyPaymobHmac(obj, hmac)) {
      return error(res, "Invalid HMAC", 401);
    }

    const orderId = String(obj.order?.id ?? "");
    const paymobTxnId = String(obj.id ?? "");

    const result = await handlePaymobWebhook(orderId, paymobTxnId, Boolean(obj?.success));
    return success(res, { received: true, ...result });
  } catch (_err) {
    return error(res, "Webhook error", 500);
  }
});

router.get("/transactions/:id/status", auth, async (req, res) => {
  try {
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (!transaction) {
      return error(res, "المعاملة غير موجودة", 404);
    }

    const { enrolled, question_created: questionCreated, subscription_activated } =
      await resolveTransactionFulfillment(transaction, req.user.id);

    return success(res, {
      transaction,
      enrolled,
      question_created: questionCreated,
      subscription_activated
    });
  } catch (_err) {
    return error(res, "Failed to fetch transaction status", 500);
  }
});

router.get("/history", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { from, to } = paginate(page, limit);
    const { data, count, error: dbError } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (dbError) throw dbError;

    return paginated(res, data || [], paginationMeta(count, Number(page), Number(limit)));
  } catch (_err) {
    return error(res, "Failed to fetch history", 500);
  }
});

export default router;
