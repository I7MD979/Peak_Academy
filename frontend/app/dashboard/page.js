import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePostAuthPath } from "@/lib/role-routes-server";

export default async function DashboardRedirectPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const destination = await resolvePostAuthPath(supabase, session.access_token);
  redirect(destination);
}
