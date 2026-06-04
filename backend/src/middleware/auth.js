import { supabase } from "../lib/supabase.js";
import { ensureUserProfile, normalizeRole } from "../utils/ensure-user-profile.js";

const INCOMPLETE_PROFILE_PATHS = [
  "/auth/setup-profile",
  "/auth/me",
  "/auth/complete-profile",
  "/auth/profile"
];

function allowsIncompleteProfile(path) {
  return INCOMPLETE_PROFILE_PATHS.some((segment) => path.includes(segment));
}

export async function resolveAuthUserFromToken(token) {
  if (!token) return null;

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  const meta = user.user_metadata || {};
  let { data: dbUser, error: profileError } = await supabase
    .from("users")
    .select("id, role, full_name, is_active, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  if ((!dbUser || profileError) && meta.role && String(meta.full_name || "").trim().length >= 2) {
    try {
      await ensureUserProfile(supabase, {
        id: user.id,
        email: user.email,
        full_name: String(meta.full_name).trim(),
        role: meta.role,
        phone: meta.phone || null,
        grade: meta.grade || null
      });

      const retry = await supabase
        .from("users")
        .select("id, role, full_name, is_active, email, phone")
        .eq("id", user.id)
        .maybeSingle();
      dbUser = retry.data;
      profileError = retry.error;
    } catch (provisionError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Auth auto-provision skipped:", provisionError.message);
      }
    }
  }

  if (dbUser && !profileError) {
    if (!dbUser.is_active) return null;
    return { user: dbUser, profileReady: true };
  }

  const role = normalizeRole(meta.role);
  const fullName = String(meta.full_name || "").trim();
  if (!role || fullName.length < 2) return null;

  return {
    user: {
      id: user.id,
      email: user.email || "",
      role,
      full_name: fullName,
      phone: null,
      is_active: true
    },
    profileReady: false
  };
}

export const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "لم يتم إرسال رمز الدخول" });
    }

    const resolved = await resolveAuthUserFromToken(token);
    if (!resolved) {
      return res.status(401).json({ success: false, error: "رمز الدخول غير صالح" });
    }

    const { user: dbUser, profileReady } = resolved;

    if (profileReady) {
      req.user = dbUser;
      req.profileReady = true;
      return next();
    }

    req.user = dbUser;
    req.profileReady = false;

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
