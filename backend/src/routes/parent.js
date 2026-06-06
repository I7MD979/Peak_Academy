import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";
import {
  buildReportPdfText,
  getStudentReportForParent,
  listLinkedStudents
} from "../services/parentReportService.js";
import { CACHE, withCache, invalidatePattern } from "../lib/cache.js";

const router = Router();

const VALID_PERIODS = new Set(["month", "week", "custom"]);

function parseReportDateRange(fromRaw, toRaw) {
  const result = { from: null, to: null, invalid: false };
  if (fromRaw) {
    const fromDate = new Date(String(fromRaw));
    if (Number.isNaN(fromDate.getTime())) {
      result.invalid = true;
      return result;
    }
    result.from = fromDate.toISOString();
  }
  if (toRaw) {
    const toDate = new Date(String(toRaw));
    if (Number.isNaN(toDate.getTime())) {
      result.invalid = true;
      return result;
    }
    toDate.setHours(23, 59, 59, 999);
    result.to = toDate.toISOString();
  }
  if (result.from && result.to && result.from > result.to) {
    result.invalid = true;
  }
  return result;
}

function resolveReportWindow({ period, from, to }) {
  const custom = parseReportDateRange(from, to);
  if (custom.invalid) return { invalid: true };

  if (custom.from || custom.to) {
    return { from: custom.from, to: custom.to, invalid: false };
  }

  const now = Date.now();
  if (period === "week") {
    return {
      from: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: null,
      invalid: false
    };
  }

  return {
    from: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: null,
    invalid: false
  };
}

router.get("/dashboard", auth, checkRole("parent"), async (req, res) => {
  try {
    const children = await listLinkedStudents(req.user.id);
    const requestedId = req.query.student_id ? String(req.query.student_id) : null;
    const selectedId =
      requestedId && children.some((c) => c.id === requestedId)
        ? requestedId
        : children[0]?.id || null;

    let report = null;
    if (selectedId) {
      report = await getStudentReportForParent(req.user.id, selectedId);
      if (!report) return error(res, "تعذر تحميل بيانات الطالب", 404);
    }

    const { data: parentUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", req.user.id)
      .maybeSingle();

    return success(res, {
      children,
      selected_student_id: selectedId,
      parent_name: parentUser?.full_name || "",
      report
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /parent/dashboard", err);
    return error(res, "تعذر تحميل لوحة ولي الأمر", 500);
  }
});

router.get("/children", auth, checkRole("parent"), async (req, res) => {
  try {
    const children = await listLinkedStudents(req.user.id);
    return success(res, { children });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /parent/children", err);
    return error(res, "تعذر تحميل قائمة الأبناء", 500);
  }
});

router.post("/link-student", auth, checkRole("parent"), async (req, res) => {
  try {
    const studentCode = String(req.body.student_code || "")
      .trim()
      .toUpperCase();

    if (!studentCode || studentCode.length < 6 || studentCode.length > 12) {
      return error(res, "كود الربط غير صالح", 400);
    }

    if (!/^[A-Z0-9-]+$/.test(studentCode)) {
      return error(res, "كود الربط يحتوي على أحرف غير مسموحة", 400);
    }

    const { data: student, error: findError } = await supabase
      .from("student_profiles")
      .select("id, parent_id, user:users(full_name)")
      .eq("link_code", studentCode)
      .maybeSingle();

    if (findError) throw findError;
    if (!student) return error(res, "لم يتم العثور على طالب بهذا الكود", 404);
    if (student.parent_id && student.parent_id !== req.user.id) {
      return error(res, "هذا الطالب مربوط بولي أمر آخر", 409);
    }
    if (student.parent_id === req.user.id) {
      return success(res, { student_id: student.id }, "الطالب مربوط بالفعل بحسابك");
    }

    const { error: updateError } = await supabase
      .from("student_profiles")
      .update({ parent_id: req.user.id })
      .eq("id", student.id);

    if (updateError) throw updateError;

    await invalidatePattern(`parent:${req.user.id}:`);
    return success(
      res,
      { student_id: student.id, full_name: student.user?.full_name },
      "تم ربط الطالب بنجاح"
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("POST /parent/link-student", err);
    return error(res, "تعذر ربط الطالب", 500);
  }
});

router.get("/report/:studentId", auth, checkRole("parent"), async (req, res) => {
  try {
    const studentId = String(req.params.studentId || "").trim();
    if (!studentId || studentId.length > 64) {
      return error(res, "معرّف الطالب غير صالح", 400);
    }

    const period = VALID_PERIODS.has(String(req.query.period)) ? String(req.query.period) : "month";
    const window = resolveReportWindow({
      period,
      from: req.query.from,
      to: req.query.to
    });

    if (window.invalid) {
      return error(res, "نطاق التاريخ غير صالح", 400);
    }

    const month = new Date().toISOString().slice(0, 7);
    const cacheKey = CACHE.parentReport(
      req.user.id,
      studentId,
      `${month}:${period}:${window.from || ""}:${window.to || ""}`
    );

    const report = await withCache(cacheKey, CACHE.TTL.parentReport, async () =>
      getStudentReportForParent(req.user.id, studentId, {
        from: window.from,
        to: window.to
      })
    );

    if (!report) return error(res, "الطالب غير موجود أو غير مربوط بحسابك", 404);
    return success(res, report);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /parent/report", err);
    return error(res, "تعذر تحميل التقرير", 500);
  }
});

router.get("/report/:studentId/pdf", auth, checkRole("parent"), async (req, res) => {
  try {
    const studentId = String(req.params.studentId || "").trim();
    if (!studentId || studentId.length > 64) {
      return error(res, "معرّف الطالب غير صالح", 400);
    }

    const report = await getStudentReportForParent(req.user.id, studentId);
    if (!report) return error(res, "الطالب غير موجود أو غير مربوط بحسابك", 404);

    const text = buildReportPdfText(report);
    const buffer = Buffer.from(text, "utf8");
    const safeName = (report.student.full_name || "student").replace(/[^\w\u0600-\u06FF-]+/g, "-");

    if (report.student.user_id) {
      await supabase.from("parent_reports").insert({
        id: `pr-${Date.now()}`,
        parent_id: req.user.id,
        student_id: report.student.user_id,
        mime_type: "text/plain; charset=utf-8",
        storage_key: `inline:${Date.now()}`,
        generated_at: new Date().toISOString()
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="peak-report-${safeName}.txt"`
    );
    return res.send(buffer);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /parent/report/pdf", err);
    return error(res, "تعذر إنشاء ملف التقرير", 500);
  }
});

export default router;
