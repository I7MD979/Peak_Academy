import { ROLE_LABELS_AR } from "@/lib/profile-form";

export function getUserDisplay(authUser, apiUser = null) {
  if (apiUser) {
    return {
      full_name: apiUser.full_name || apiUser.email?.split("@")[0] || "مستخدم",
      avatar_url: apiUser.avatar_url || "",
      email: apiUser.email || "",
      role: apiUser.role || "",
      roleLabel: ROLE_LABELS_AR[apiUser.role] || ROLE_LABELS_AR.admin
    };
  }

  if (!authUser) {
    return { full_name: "", avatar_url: "", email: "", role: "", roleLabel: "" };
  }

  const meta = authUser.user_metadata || {};
  const role = meta.role || "admin";
  return {
    full_name: meta.full_name || authUser.email?.split("@")[0] || "مستخدم",
    avatar_url: meta.avatar_url || "",
    email: authUser.email || "",
    role,
    roleLabel: ROLE_LABELS_AR[role] || ROLE_LABELS_AR.admin
  };
}
