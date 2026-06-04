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
      .single();

    return success(res, {
      children,
      selected_student_id: selectedId,
      parent_name: parentUser?.full_name || "",
      report
    });
  } catch (_err) {
    return error(res, "تعذر تحميل لوحة ولي الأمر", 500);
  }
});

router.get("/children", auth, checkRole("parent"), async (req, res) => {
  try {
    const children = await listLinkedStudents(req.user.id);
    return success(res, { children });
  } catch (_err) {
    return error(res, "تعذر تحميل قائمة الأبناء", 500);
  }
});

router.post("/link-student", auth, checkRole("parent"), async (req, res) => {
  try {
    const studentCode = String(req.body.student_code || "")
      .trim()
      .toUpperCase();

    if (!studentCode || studentCode.length < 6) {
      return error(res, "كود الربط غير صالح", 400);
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
  } catch (_err) {
    return error(res, "تعذر ربط الطالب", 500);
  }
});

router.get("/report/:studentId", auth, checkRole("parent"), async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const cacheKey = CACHE.parentReport(req.user.id, req.params.studentId, month);
    const report = await withCache(cacheKey, CACHE.TTL.parentReport, async () =>
      getStudentReportForParent(req.user.id, req.params.studentId)
    );
    if (!report) return error(res, "الطالب غير موجود أو غير مربوط بحسابك", 404);
    return success(res, report);
  } catch (_err) {
    return error(res, "تعذر تحميل التقرير", 500);
  }
});

router.get("/report/:studentId/pdf", auth, checkRole("parent"), async (req, res) => {
  try {
    const report = await getStudentReportForParent(req.user.id, req.params.studentId);
    if (!report) return error(res, "الطالب غير موجود أو غير مربوط بحسابك", 404);

    const text = buildReportPdfText(report);
    const buffer = Buffer.from(text, "utf8");
    const safeName = (report.student.full_name || "student").replace(/\s+/g, "-");

    await supabase.from("parent_reports").insert({
      id: `pr-${Date.now()}`,
      parent_id: req.user.id,
      student_id: req.params.studentId,
      mime_type: "text/plain; charset=utf-8",
      storage_key: `inline:${Date.now()}`,
      generated_at: new Date().toISOString()
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="peak-report-${safeName}.txt"`
    );
    return res.send(buffer);
  } catch (_err) {
    return error(res, "تعذر إنشاء ملف التقرير", 500);
  }
});

export default router;
