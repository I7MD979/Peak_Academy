import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";
import {
  buildLinkCode,
  ensureUserProfile,
  fetchFullUserProfile,
  normalizeRole
} from "../utils/ensure-user-profile.js";

const router = Router();

router.get("/me", auth, async (req, res) => {
  try {
    let user = await fetchFullUserProfile(supabase, req.user.id);

    if (!user) {
      user = await ensureUserProfile(supabase, {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        phone: req.user.phone
      });
    }

    return success(res, user);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /auth/me", err);
    }
    return error(res, "تعذر تحميل بيانات الحساب", 500);
  }
});

/** إنشاء / إكمال الملف الشخصي بعد التسجيل (onboarding) */
router.post("/setup-profile", auth, async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const role = normalizeRole(req.body.role);
    const phone = String(req.body.phone || "").trim();
    const grade = req.body.grade;
    const section = req.body.section;

    const existing = await fetchFullUserProfile(supabase, req.user.id);
    if (existing?.role && existing.role !== role) {
      return error(res, "لا يمكن تغيير نوع الحساب بعد إنشاء الملف", 400);
    }

    if (fullName.length < 2) {
      return error(res, "الاسم يجب أن يكون حرفين على الأقل", 400);
    }

    if (role === "student" && grade && !["first", "second", "third"].includes(grade)) {
      return error(res, "الصف الدراسي غير صالح", 400);
    }

    if (phone && phone.length < 8) {
      return error(res, "رقم الهاتف غير صالح", 400);
    }

    const email = req.user.email || req.body.email;

    const user = await ensureUserProfile(supabase, {
      id: req.user.id,
      email,
      full_name: fullName,
      role,
      phone: phone || null,
      grade: role === "student" ? grade || "third" : null,
      section: role === "student" ? section : null
    });

    return success(res, user, "تم إنشاء ملفك الشخصي بنجاح");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("POST /auth/setup-profile", err);
    }
    return error(res, err.message || "تعذر إنشاء الملف الشخصي", 500);
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const bio = String(req.body.bio || "").trim();
    const avatarUrl = String(req.body.avatar_url || "").trim();
    const subjectsInput = req.body.subjects;

    if (fullName.length < 2) {
      return error(res, "الاسم يجب أن يكون حرفين على الأقل", 400);
    }

    if (bio.length > 1000) {
      return error(res, "النبذة المهنية طويلة جدًا (الحد الأقصى 1000 حرف)", 400);
    }

    if (phone && phone.length < 8) {
      return error(res, "رقم الهاتف غير صالح", 400);
    }

    let subjects = [];
    if (Array.isArray(subjectsInput)) {
      subjects = subjectsInput.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof subjectsInput === "string") {
      subjects = subjectsInput
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (subjects.length > 12) {
      return error(res, "يمكنك إضافة 12 مادة كحد أقصى", 400);
    }

    const userUpdate = {
      full_name: fullName,
      phone: phone || null
    };

    if (avatarUrl) {
      if (!/^https?:\/\/.+/i.test(avatarUrl)) {
        return error(res, "رابط الصورة الشخصية غير صالح", 400);
      }
      userUpdate.avatar_url = avatarUrl;
    }

    const { error: userError } = await supabase.from("users").update(userUpdate).eq("id", req.user.id);
    if (userError) throw userError;

    await ensureUserProfile(supabase, {
      id: req.user.id,
      email: req.user.email,
      full_name: fullName,
      role: req.user.role,
      phone: phone || null
    });

    if (req.user.role === "teacher") {
      const { error: teacherError } = await supabase
        .from("teacher_profiles")
        .update({ bio: bio || null, subjects })
        .eq("user_id", req.user.id);
      if (teacherError) throw teacherError;
    }

    if (req.user.role === "student") {
      const grade = req.body.grade;
      const sectionRaw = req.body.section;
      const studentUpdate = {};

      if (grade !== undefined && grade !== null && grade !== "") {
        if (!["first", "second", "third"].includes(grade)) {
          return error(res, "الصف الدراسي غير صالح", 400);
        }
        studentUpdate.grade = grade;
      }

      if (sectionRaw !== undefined) {
        const section = String(sectionRaw || "").trim();
        if (section.length > 50) {
          return error(res, "اسم الشعبة طويل جدًا", 400);
        }
        studentUpdate.section = section || null;
      }

      if (Object.keys(studentUpdate).length > 0) {
        const { data: existingStudent } = await supabase
          .from("student_profiles")
          .select("id, link_code")
          .eq("user_id", req.user.id)
          .maybeSingle();

        const { error: studentUpsertError } = await supabase.from("student_profiles").upsert(
          {
            user_id: req.user.id,
            link_code: existingStudent?.link_code || buildLinkCode(req.user.id),
            ...studentUpdate
          },
          { onConflict: "user_id" }
        );
        if (studentUpsertError) throw studentUpsertError;
      }
    }

    const user = await fetchFullUserProfile(supabase, req.user.id);
    return success(res, user, "تم حفظ الملف الشخصي بنجاح");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("PUT /auth/profile", err);
    }
    return error(res, "تعذر حفظ الملف الشخصي", 500);
  }
});

router.post("/complete-profile", auth, async (req, res) => {
  try {
    const existing = await fetchFullUserProfile(supabase, req.user.id);
    const fullName = String(req.body.full_name || req.user.full_name || "").trim();
    const role = normalizeRole(req.body.role || req.user.role);

    if (existing?.role && existing.role !== role) {
      return error(res, "لا يمكن تغيير نوع الحساب بعد إنشاء الملف", 400);
    }
    const phone = String(req.body.phone || "").trim();
    const { grade, section, subjects } = req.body;

    if (fullName.length < 2) {
      return error(res, "الاسم يجب أن يكون حرفين على الأقل", 400);
    }

    if (role === "student" && grade && !["first", "second", "third"].includes(grade)) {
      return error(res, "الصف الدراسي غير صالح", 400);
    }

    if (phone && phone.length < 8) {
      return error(res, "رقم الهاتف غير صالح", 400);
    }

    const user = await ensureUserProfile(supabase, {
      id: req.user.id,
      email: req.user.email,
      full_name: fullName,
      role,
      phone: phone || null,
      grade: role === "student" ? grade || "third" : null,
      section: role === "student" ? section : null,
      subjects: subjects || []
    });
    return success(res, user, "تم إكمال الملف الشخصي بنجاح");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("POST /auth/complete-profile", err);
    }
    return error(res, err.message || "تعذر إكمال الملف الشخصي", 500);
  }
});

export default router;
