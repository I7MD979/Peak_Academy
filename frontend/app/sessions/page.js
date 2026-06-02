import { createServerSupabaseClient } from "@/lib/supabase/server";
import SessionCard from "@/components/shared/SessionCard";
import EmptyState from "@/components/shared/EmptyState";
import { mapSessionForCard } from "@/lib/session-mapper";

export default async function SessionsPage() {
  const supabase = createServerSupabaseClient();
  const { data: sessions = [], error } = await supabase
    .from("sessions")
    .select("id,title,price_per_student,scheduled_at,status,teacher:teacher_profiles(user:users(full_name)),subject:subjects(name_ar,icon)")
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .range(0, 19);

  const items = (error ? [] : sessions).map(mapSessionForCard);

  return (
    <main className="space-y-4 bg-bg p-4 md:p-6">
      <h1 className="text-xl font-bold text-primary">كل الجلسات</h1>
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد جلسات مجدولة حالياً" />
      )}
    </main>
  );
}
