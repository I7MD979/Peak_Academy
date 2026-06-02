import { supabase } from "../lib/supabase.js";
import { normalizeRole } from "../utils/ensure-user-profile.js";

export const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "لم يتم إرسال رمز الدخول" });
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: "رمز الدخول غير صالح" });
    }

    const { data: dbUser, error: profileError } = await supabase
      .from("users")
      .select("id, role, full_name, is_active, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (dbUser && !profileError) {
      if (!dbUser.is_active) {
        return res.status(403).json({ success: false, error: "الحساب موقوف" });
      }
      req.user = dbUser;
      req.profileReady = true;
      return next();
    }

    const meta = user.user_metadata || {};
    req.user = {
      id: user.id,
      email: user.email || "",
      role: normalizeRole(meta.role),
      full_name: String(meta.full_name || "").trim(),
      phone: null,
      is_active: true
    };
    req.profileReady = false;

    const path = req.originalUrl || "";
    if (!path.includes("/auth/setup-profile")) {
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
