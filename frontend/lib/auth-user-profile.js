/** ملف مؤقت من جلسة Supabase عند تعذّر جلب /auth/me */
export function profileFromAuthUser(authUser) {
  if (!authUser?.id) return null;

  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email || "",
    full_name: meta.full_name || authUser.email?.split("@")[0] || "مستخدم",
    phone: meta.phone || "",
    avatar_url: meta.avatar_url || "",
    role: meta.role || "",
    is_active: true,
    is_verified: Boolean(authUser.email_confirmed_at),
    created_at: authUser.created_at,
    _fromAuthOnly: true
  };
}
