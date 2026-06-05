import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { mapDbError } from "../utils/db-errors.js";
import { success, error } from "../utils/response.js";
import {
  buildLinkCode,
  ensureUserProfile,
  fetchFullUserProfile,
  normalizeRole
} from "../utils/ensure-user-profile.js";
import { ensureReferralCode } from "../services/referralService.js";

const router = Router();

function onboardingRedirectUrl() {
  return `${(process.env.FRONTEND_URL || "https://peak-academy.net").replace(/\/$/, "")}/onboarding`;
}

/** Browser visits — profile setup is a frontend page, not a GET API */
router.get("/setup-profile", (_req, res) => {
  res.redirect(302, onboardingRedirectUrl());
});

function profileFromReqUser(reqUser) {
  const role = normalizeRole(reqUser.role);
  return {
    id: reqUser.id,
    email: reqUser.email || "",
    phone: reqUser.phone || null,
    full_name: reqUser.full_name || "مستخدم",
    avatar_url: reqUser.avatar_url || null,
    role,
    is_active: reqUser.is_active !== false,
    is_verified: Boolean(reqUser.is_verified),
    student_profile: null,
    teacher_profile: null,
    profile_complete: role === "admin" || role === "parent"
  };
}

router.get("/me", auth, async (req, res) => {
  try {
    let user = null;

    try {
      user = await fetchFullUserProfile(supabase, req.user.id);
    } catch (fetchErr) {
      console.error("GET /auth/me fetchFullUserProfile:", fetchErr?.message || fetchErr);
    }

    if (!user) {
      try {
        user = await ensureUserProfile(supabase, {
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.full_name,
          role: req.user.role,
          phone: req.user.phone
        });
      } catch (ensureErr) {
        console.error("GET /auth/me ensureUserProfile:", ensureErr?.message || ensureErr);
        user = profileFromReqUser(req.user);
      }
    }

    if (!user) {
      return error(res, "تعذر تحميل بيانات الحساب", 404);
    }

    if (user.role === "student") {
      try {
        await ensureReferralCode(user);
      } catch (refErr) {
        console.warn("GET /auth/me referral:", refErr?.message || refErr);
      }
    }

    return success(res, user);
  } catch (err) {
    console.error("GET /auth/me", err?.message || err);
    return error(res, "تعذر تحميل بيانات الحساب", 500);
  }
});

async function fetchExistingUserRole(userId) {
  const { data, error: dbError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (dbError && process.env.NODE_ENV !== "production") {
    console.warn("setup-profile role lookup:", dbError.message);
  }

  return data?.role ? normalizeRole(data.role) : null;
}

async function syncAuthUserMetadata(userId, { role, full_name, phone }) {
  try {
    const meta = { role, full_name };
    if (phone) meta.phone = phone;
    await supabase.auth.admin.updateUserById(userId, { user_metadata: meta });
  } catch (metaErr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("setup-profile auth metadata:", metaErr?.message || metaErr);
    }
  }
}

/** إنشاء / إكمال الملف الشخصي بعد التسجيل (onboarding) */
router.post("/setup-profile", auth, async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const role = normalizeRole(req.body.role);
    const phone = String(req.body.phone || "").trim();
    const grade = req.body.grade;
    const section = req.body.section;

    const existingRole = await fetchExistingUserRole(req.user.id);
    if (existingRole && existingRole !== role) {
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

    let user;
    try {
      user = await ensureUserProfile(supabase, {
        id: req.user.id,
        email,
        full_name: fullName,
        role,
        phone: phone || null,
        grade: role === "student" ? grade || "third" : null,
        section: role === "student" ? section : null
      });
    } catch (ensureErr) {
      console.error("POST /auth/setup-profile ensure:", ensureErr?.message || ensureErr);
      const mapped = mapDbError(ensureErr);
      return error(res, mapped.message, mapped.status);
    }

    if (!user) {
      user = profileFromReqUser({
        ...req.user,
        full_name: fullName,
        role,
        phone: phone || null
      });
      if (role === "student") {
        user.student_profile = {
          grade: grade && ["first", "second", "third"].includes(grade) ? grade : "third",
          section: section || null,
          link_code: buildLinkCode(req.user.id)
        };
        user.profile_complete = true;
      }
      if (role === "teacher") {
        user.teacher_profile = { subjects: [] };
        user.profile_complete = true;
      }
    }

    await syncAuthUserMetadata(req.user.id, {
      role: user.role || role,
      full_name: fullName,
      phone: phone || null
    });

    return success(res, user, "تم إنشاء ملفك الشخصي بنجاح");
  } catch (err) {
    console.error("POST /auth/setup-profile", err?.message || err);
    const mapped = mapDbError(err);
    return error(res, mapped.message, mapped.status);
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
      const teacherUpdate = { bio: bio || null, subjects };
      const gradesInput = req.body.grades;
      if (Array.isArray(gradesInput)) {
        teacherUpdate.grades = gradesInput.map((g) => String(g).trim()).filter(Boolean).slice(0, 6);
      }
      const experienceYears = req.body.experience_years;
      if (experienceYears !== undefined && experienceYears !== null && experienceYears !== "") {
        const years = Number(experienceYears);
        if (Number.isFinite(years) && years >= 0 && years <= 60) {
          teacherUpdate.experience_years = Math.floor(years);
        }
      }
      const education = String(req.body.education || "").trim();
      if (education.length <= 200) teacherUpdate.education = education || null;
      const socialUrl = String(req.body.social_url || "").trim();
      if (socialUrl && !/^https?:\/\/.+/i.test(socialUrl)) {
        return error(res, "رابط السوشيال ميديا غير صالح", 400);
      }
      if (socialUrl.length <= 500) teacherUpdate.social_url = socialUrl || null;

      const { error: teacherError } = await supabase
        .from("teacher_profiles")
        .update(teacherUpdate)
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

router.post("/avatar", auth, async (req, res) => {
  try {
    const contentType = String(req.body.content_type || "").toLowerCase();
    const imageBase64 = String(req.body.image_base64 || "").trim();

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(contentType)) {
      return error(res, "نوع الصورة غير مدعوم. استخدم JPEG أو PNG أو WebP", 400);
    }

    if (!imageBase64) {
      return error(res, "لم يتم إرسال صورة", 400);
    }

    const buffer = Buffer.from(imageBase64, "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return error(res, "حجم الصورة يجب ألا يتجاوز 2 ميجابايت", 400);
    }

    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const storagePath = `${req.user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, buffer, { upsert: true, contentType });

    if (uploadError) {
      console.error("POST /auth/avatar upload:", uploadError.message);
      return error(res, "تعذر رفع الصورة. تأكد من إعداد bucket الصور في Supabase", 500);
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      return error(res, "تعذر الحصول على رابط الصورة", 500);
    }

    const { error: userError } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", req.user.id);
    if (userError) throw userError;

    const user = await fetchFullUserProfile(supabase, req.user.id);
    return success(res, { avatar_url: publicUrl, user }, "تم تحديث الصورة الشخصية");
  } catch (err) {
    console.error("POST /auth/avatar", err?.message || err);
    return error(res, "تعذر رفع الصورة الشخصية", 500);
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
