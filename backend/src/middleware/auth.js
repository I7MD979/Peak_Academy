import { supabase } from "../lib/supabase.js";
import { verifySupabaseAccessToken } from "../lib/verify-supabase-jwt.js";
import {
  ensureUserProfile,
  isRoleProfileComplete,
  normalizeRole
} from "../utils/ensure-user-profile.js";

const INCOMPLETE_PROFILE_PATHS = [
  "/auth/setup-profile",
  "/auth/me",
  "/auth/complete-profile",
  "/auth/profile"
];

function allowsIncompleteProfile(path) {
  return INCOMPLETE_PROFILE_PATHS.some((segment) => path.includes(segment));
}

function metaFullName(meta) {
  return String(meta.full_name || meta.name || meta.display_name || "").trim();
}

/** Admin/parent need no student/teacher profile; student/teacher need role-specific rows. */
async function computeProfileReady(supabase, reqUser, profile) {
  const fullName = String(reqUser.full_name || "").trim();
  if (fullName.length < 2) return false;

  const role = reqUser.role;
  if (role === "admin" || role === "parent") return true;

  if (!profile?.id) return false;

  if (role === "student") {
    const { data } = await supabase
      .from("student_profiles")
      .select("id, grade")
      .eq("user_id", reqUser.id)
      .maybeSingle();
    return isRoleProfileComplete("student", { student_profile: data });
  }

  if (role === "teacher") {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", reqUser.id)
      .maybeSingle();
    return isRoleProfileComplete("teacher", { teacher_profile: data });
  }

  return true;
}

function buildReqUser(authUser, profile) {
  const meta = authUser.user_metadata || {};
  const name = metaFullName(meta);
  const role = normalizeRole(profile?.role || meta.role);
  const fullName =
    profile?.full_name ||
    (name.length >= 2 ? name : String(authUser.email?.split("@")?.[0] || "مستخدم بيك").trim());

  return {
    id: authUser.id,
    email: profile?.email || authUser.email || "",
    role,
    full_name: fullName.length >= 2 ? fullName : "مستخدم بيك",
    phone: profile?.phone || (meta.phone ? String(meta.phone).trim() : null),
    avatar_url: profile?.avatar_url || meta.avatar_url || null,
    is_active: profile?.is_active ?? true
  };
}

/**
 * Verify a Supabase Auth access token (JWT) via supabase.auth.getUser — not a custom JWT_SECRET.
 */
export async function resolveAuthUserFromToken(token) {
  if (!token) return null;

  try {
    const { user: authUser, error: verifyError } = await verifySupabaseAccessToken(token);

    if (!authUser) {
      console.warn("[auth] token verification failed:", verifyError);
      return null;
    }

    const meta = authUser.user_metadata || {};
    const name = metaFullName(meta);

    let { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, email, role, avatar_url, phone, is_active")
      .eq("id", authUser.id)
      .maybeSingle();

    if ((!profile || profileError) && name.length >= 2) {
      try {
        await ensureUserProfile(supabase, {
          id: authUser.id,
          email: authUser.email,
          full_name: name,
          role: meta.role || "student",
          phone: meta.phone || null,
          grade: meta.grade || null
        });

        const retry = await supabase
          .from("users")
          .select("id, full_name, email, role, avatar_url, phone, is_active")
          .eq("id", authUser.id)
          .maybeSingle();
        profile = retry.data;
        profileError = retry.error;
      } catch (provisionError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[auth] auto-provision skipped:", provisionError.message);
        }
      }
    }

    const reqUser = buildReqUser(authUser, profile);

    if (profile?.is_active === false) return null;

    const profileReady = await computeProfileReady(supabase, reqUser, profile);

    return {
      user: reqUser,
      profileReady,
      authUser
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] resolveAuthUserFromToken:", err.message);
    }
    return null;
  }
}

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "لم يتم توفير رمز المصادقة" });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ success: false, error: "لم يتم توفير رمز المصادقة" });
    }

    const resolved = await resolveAuthUserFromToken(token);
    if (!resolved) {
      const payload = {
        success: false,
        error: "رمز الدخول غير صالح",
        code: "AUTH_INVALID"
      };
      if (process.env.NODE_ENV !== "production") {
        payload.hint =
          "تأكد أن Railway SUPABASE_URL يطابق Vercel (مثلاً hpczrdvaeazrrrzgtatl.supabase.co) وأن SUPABASE_SERVICE_KEY هو service_role وليس anon.";
      }
      return res.status(401).json(payload);
    }

    const { user, profileReady, authUser } = resolved;
    req.user = user;
    req.authUser = authUser;
    req.profileReady = profileReady;

    if (profileReady) {
      return next();
    }

    const path = req.originalUrl || "";
    if (!allowsIncompleteProfile(path)) {
      return res.status(403).json({
        success: false,
        error: "أكمل ملفك الشخصي أولاً",
        code: "PROFILE_INCOMPLETE"
      });
    }

    next();
  } catch (_err) {
    res.status(500).json({ success: false, error: "خطأ في المصادقة" });
  }
};
