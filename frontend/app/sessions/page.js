import { createServerSupabaseClient } from "@/lib/supabase/server";
import SessionCard from "@/components/shared/SessionCard";
import EmptyState from "@/components/shared/EmptyState";
import { mapSessionForCard } from "@/lib/session-mapper";
import { ROLE_HOME } from "@/lib/role-routes";

export default async function SessionsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  let userRole = null;
  if (session?.user?.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();
    userRole = profile?.role || null;
  }

  const { data: sessions = [], error } = await supabase
    .from("sessions")
    .select("id,title,price_per_student,scheduled_at,status,teacher:teacher_profiles(user:users(full_name)),subject:subjects(name_ar,icon)")
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .range(0, 19);

  const items = (error ? [] : sessions).map(mapSessionForCard);
  const isStudent = userRole === "student";
  const roleHome = userRole ? ROLE_HOME[userRole] : null;

  return (
    <main className="space-y-4 bg-bg p-4 md:p-6">
      <h1 className="text-xl font-bold text-primary">كل الجلسات</h1>
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              detailHref={
                isStudent
                  ? `/student/sessions/${session.id}`
                  : userRole
                    ? roleHome || "/auth/login"
                    : "/auth/register"
              }
              liveHref={isStudent ? `/student/live/${session.id}` : "/auth/login"}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد جلسات مجدولة حالياً" />
      )}
    </main>
  );
}
