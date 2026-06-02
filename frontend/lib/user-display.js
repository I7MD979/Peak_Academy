export function getUserDisplay(user) {
  if (!user) {
    return { full_name: "", avatar_url: "", role: "" };
  }

  const meta = user.user_metadata || {};
  return {
    full_name: meta.full_name || user.email?.split("@")[0] || "مستخدم",
    avatar_url: meta.avatar_url || "",
    role: meta.role || ""
  };
}
