import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { authLimiter, authSlowDown, uniformAuthResponse } from "../middleware/security.js";
import { oauthLimiter, validateRedirectUrl, validateOAuthEmail } from "../middleware/oauth-security.js";
import { supabase } from "../lib/supabase.js";
import { mapDbError } from "../utils/db-errors.js";
import { success, error } from "../utils/response.js";
import {
  buildLinkCode,
  ensureUserProfile,
  fetchFullUserProfile,
  fetchTeacherProfileRow,
  isRoleProfileComplete,
  normalizeRole,
  assertOnboardingRole
} from "../utils/ensure-user-profile.js";
import { ensureReferralCode } from "../services/referralService.js";
import { isValidGrade } from "../lib/grades.js";
import { normalizeTeacherSubjectKeys } from "../lib/subjects.js";
import { encryptUserFields } from "../utils/encryption.js";
import { allowSchema } from "../middleware/allowlist.js";

const router = Router();

router.use(validateRedirectUrl);

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
      // Do not auto-provision DB rows here — onboarding POST /auth/setup-profile owns profile creation.
      user = {
        ...profileFromReqUser(req.user),
        student_profile: null,
        teacher_profile: null,
        profile_complete: false
      };
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
router.post("/setup-profile", oauthLimiter, authSlowDown, authLimiter, uniformAuthResponse, auth, async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    let role;
    try {
      role = assertOnboardingRole(req.body.role);
    } catch (roleErr) {
      return error(res, roleErr.message, roleErr.status || 403);
    }
    const phone = String(req.body.phone || "").trim();
    const grade = req.body.grade;
    const section = req.body.section;

    if (fullName.length < 2) {
      return error(res, "الاسم يجب أن يكون حرفين على الأقل", 400);
    }

    if (role === "student" && grade && !["first", "second", "third"].includes(grade)) {
      return error(res, "الصف الدراسي غير صالح", 400);
    }

    if (role === "student" && !grade) {
      return error(res, "الصف الدراسي مطلوب للطلاب", 400);
    }

    if (phone && phone.length < 8) {
      return error(res, "رقم الهاتف غير صالح", 400);
    }

    const acceptedTerms = req.body.accepted_terms === true;
    const termsVersion = String(req.body.terms_version || "").trim();

    if (!acceptedTerms) {
      return error(res, "يجب الموافقة على الشروط والأحكام وسياسة الخصوصية", 400);
    }
    if (!termsVersion) {
      return error(res, "إصدار الشروط غير محدد", 400);
    }

    const clientIp = (req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "").trim();

    const email = req.user.email || req.body.email;

    if (email) {
      const emailCheck = validateOAuthEmail(email);
      if (!emailCheck.valid) {
        return error(res, "البريد الإلكتروني غير مقبول", 400);
      }
    }

    let user;
    try {
      user = await ensureUserProfile(supabase, {
        id: req.user.id,
        email,
        full_name: fullName,
        role,
        phone: phone || null,
        grade: role === "student" ? grade || "third" : null,
        section: role === "student" ? section : null,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion,
        termsAcceptedIp: clientIp
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

    await supabase
      .from("users")
      .update(
        encryptUserFields({
          role,
          full_name: fullName,
          phone: phone || null,
          is_active: true,
          is_verified: true
        })
      )
      .eq("id", req.user.id);

    await syncAuthUserMetadata(req.user.id, {
      role: role,
      full_name: fullName,
      phone: phone || null
    });

    // Always return a fresh, normalized profile for onboarding redirect logic.
    let fresh = await fetchFullUserProfile(supabase, req.user.id);
    if (!fresh) {
      fresh = user;
    }

    let teacherProfile =
      role === "teacher" ? fresh.teacher_profile || (await fetchTeacherProfileRow(supabase, req.user.id)) : null;

    fresh.role = role;
    fresh.full_name = fullName;
    fresh.phone = phone || null;
    if (role === "teacher") {
      fresh.teacher_profile = teacherProfile;
      fresh.student_profile = null;
    }
    fresh.profile_complete = isRoleProfileComplete(role, {
      student_profile: role === "student" ? fresh.student_profile : null,
      teacher_profile: role === "teacher" ? teacherProfile : null
    });

    if (!fresh.profile_complete) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("id, role, email")
        .eq("id", req.user.id)
        .maybeSingle();

      console.error("POST /auth/setup-profile incomplete:", {
        userId: req.user.id,
        requestedRole: role,
        dbRole: dbUser?.role,
        teacherProfileId: teacherProfile?.id,
        studentGrade: fresh.student_profile?.grade
      });

      const hint =
        role === "teacher" && !teacherProfile?.id
          ? "ملف المدرس غير موجود في قاعدة البيانات. نفّذ backend/supabase/PROMOTE_TEACHER_ACCOUNT.sql في Supabase SQL Editor."
          : "تأكد أن role في جدول users يطابق نوع الحساب (teacher) وأن migrations مفعّلة.";

      return error(res, `تعذر إكمال الملف الشخصي. ${hint}`, 500);
    }

    return success(res, fresh, "تم إنشاء ملفك الشخصي بنجاح");
  } catch (err) {
    console.error("POST /auth/setup-profile", err?.message || err);
    const mapped = mapDbError(err);
    return error(res, mapped.message, mapped.status);
  }
});

router.put("/profile", auth, allowSchema("userProfile"), async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const bio = String(req.body.bio || "").trim();
    const avatarUrl = String(req.body.avatar_url || "").trim();
    const subjectsInput = req.body.subjects;

    if (fullName.length < 2) {
      return error(res, "الاسم يجب أن يكون حرفين على الأقل", 400);
    }

    if (fullName.length > 80) {
      return error(res, "الاسم طويل جداً (80 حرفاً كحد أقصى)", 400);
    }

    if (bio.length > 1000) {
      return error(res, "النبذة المهنية طويلة جدًا (الحد الأقصى 1000 حرف)", 400);
    }

    if (phone && phone.length < 8) {
      return error(res, "رقم الهاتف غير صالح", 400);
    }

    if (phone && phone.length > 20) {
      return error(res, "رقم الهاتف طويل جداً", 400);
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

    if (req.user.role === "teacher") {
      subjects = normalizeTeacherSubjectKeys(subjects);
    }

    const userUpdate = {
      full_name: fullName,
      phone: phone || null
    };

    if (avatarUrl) {
      const supabaseStorageBase = `${process.env.SUPABASE_URL}/storage/v1/object/public/`;
      const allowedAvatarDomains = [
        supabaseStorageBase,
        "https://lh3.googleusercontent.com/",
        "https://avatars.githubusercontent.com/"
      ];
      const isAllowedAvatar = allowedAvatarDomains.some((d) => avatarUrl.startsWith(d));
      if (!isAllowedAvatar && !/^https:\/\/[a-zA-Z0-9.-]+\.supabase\.co\//.test(avatarUrl)) {
        return error(res, "مصدر الصورة غير مسموح", 400);
      }
      if (avatarUrl.length > 500) {
        return error(res, "رابط الصورة الشخصية طويل جداً", 400);
      }
      userUpdate.avatar_url = avatarUrl;
    } else if (req.body.avatar_url === "") {
      userUpdate.avatar_url = null;
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
        const uniqueGrades = [];
        for (const raw of gradesInput) {
          const grade = String(raw || "").trim();
          if (!grade || uniqueGrades.includes(grade)) continue;
          if (!isValidGrade(grade)) {
            return error(res, "الصف الدراسي غير صالح", 400);
          }
          uniqueGrades.push(grade);
          if (uniqueGrades.length >= 6) break;
        }
        teacherUpdate.grades = uniqueGrades;
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

router.post("/complete-profile", oauthLimiter, authSlowDown, authLimiter, uniformAuthResponse, auth, async (req, res) => {
  try {
    const existing = await fetchFullUserProfile(supabase, req.user.id);
    const fullName = String(req.body.full_name || req.user.full_name || "").trim();
    let role;
    try {
      role = assertOnboardingRole(req.body.role || req.user.role);
    } catch (roleErr) {
      return error(res, roleErr.message, roleErr.status || 403);
    }

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
