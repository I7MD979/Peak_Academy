import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/role-routes";

export default async function SessionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    redirect("/auth/login?redirect=/student/sessions");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role && ROLE_HOME[role]) {
    const target =
      role === "student" ? "/student/sessions" : ROLE_HOME[role];
    redirect(target);
  }

  redirect("/onboarding");
}
