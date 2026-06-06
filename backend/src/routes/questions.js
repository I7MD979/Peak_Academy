import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import { supabase } from "../lib/supabase.js";
import { isValidGrade } from "../lib/grades.js";
import {
  createQuestion,
  getQuestionsOverview,
  getQuestionPricing,
  getStudentGrade,
  getStudentQuestion,
  listStudentQuestions,
  SUBJECT_LABELS,
  verifyQuestionPayment
} from "../services/questionsService.js";

const router = Router();

const VALID_SUBJECT_KEYS = Object.keys(SUBJECT_LABELS).filter((k) => k !== "general");

const submitSchema = z.object({
  subject: z.string().min(1).max(32),
  content: z.string().min(10, "اكتب سؤالك بشكل أوضح (10 أحرف على الأقل)").max(2000),
  payment_id: z.string().optional()
});

router.get("/overview", auth, checkRole("student"), async (req, res) => {
  try {
    const overview = await getQuestionsOverview(req.user.id);
    if (!overview.grade) {
      return error(res, "أكمل صفك الدراسي في الملف الشخصي لإرسال الأسئلة", 400);
    }
    return success(res, overview);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /questions/overview", err);
    return error(res, "تعذر تحميل صفحة الأسئلة", 500);
  }
});

router.get("/", auth, checkRole("student"), async (req, res) => {
  try {
    const { tab = "all", page = 1, limit = 10, subject = "", from = "", to = "" } = req.query;
    const result = await listStudentQuestions(req.user.id, {
      tab,
      page,
      limit,
      subject: subject || null,
      from: from || null,
      to: to || null
    });
    return success(res, result);
  } catch (err) {
    if (err.status === 400) return error(res, err.message, 400);
    if (process.env.NODE_ENV !== "production") console.error("GET /questions", err);
    return error(res, "تعذر تحميل أسئلتك", 500);
  }
});

router.get("/:id", auth, checkRole("student"), async (req, res) => {
  const questionId = String(req.params.id || "").trim();
  if (!questionId || questionId.length > 64) {
    return error(res, "معرّف السؤال غير صالح", 400);
  }

  try {
    const question = await getStudentQuestion(req.user.id, questionId);
    if (!question) return error(res, "السؤال غير موجود", 404);
    return success(res, question);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /questions/:id", err);
    return error(res, "تعذر تحميل السؤال", 500);
  }
});

router.post("/", auth, checkRole("student"), async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "بيانات السؤال غير صالحة";
    return error(res, msg, 400);
  }

  const subjectKey = String(parsed.data.subject).trim().toLowerCase();
  if (!VALID_SUBJECT_KEYS.includes(subjectKey)) {
    return error(res, "المادة غير صالحة", 400);
  }

  try {
    const grade = await getStudentGrade(req.user.id);
    if (!grade || !isValidGrade(grade)) {
      return error(res, "حدد صفك الدراسي في الملف الشخصي أولاً", 400);
    }

    const { content, payment_id } = parsed.data;
    const pricing = await getQuestionPricing(subjectKey, grade);
    const amount = Number(pricing?.amount || 0);

    if (amount > 0) {
      if (!payment_id) {
        return error(
          res,
          "يتطلب الدفع قبل إرسال السؤال",
          402,
          {
            requires_payment: true,
            amount,
            subject: subjectKey,
            grade,
            subject_label: SUBJECT_LABELS[subjectKey] || subjectKey
          },
          "PAYMENT_REQUIRED"
        );
      }

      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", payment_id)
        .eq("user_id", req.user.id)
        .eq("type", "question_payment")
        .maybeSingle();

      if (!tx) {
        return error(res, "معاملة الدفع غير موجودة", 400);
      }

      const meta = tx.metadata || {};
      if (meta.subject !== subjectKey || meta.content !== content.trim()) {
        return error(res, "بيانات الدفع لا تطابق السؤال الحالي", 400);
      }

      const paid = await verifyQuestionPayment(req.user.id, payment_id, {
        subject: subjectKey,
        content: content.trim()
      });
      if (!paid) {
        return error(res, "لم يتم التحقق من الدفع. أكمل الدفع ثم أعد الإرسال", 402, null, "PAYMENT_REQUIRED");
      }
    }

    const question = await createQuestion({
      userId: req.user.id,
      subject: subjectKey,
      content: content.trim(),
      paymentId: payment_id || null
    });

    return success(res, question, "تم إرسال سؤالك للمدرسين", 201);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("POST /questions", err);
    return error(res, "تعذر إرسال السؤال", 500);
  }
});

export default router;
