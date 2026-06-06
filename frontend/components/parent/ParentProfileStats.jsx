"use client";

import StatsCard from "@/components/admin/StatsCard";
import { formatJoinDateAr, ROLE_LABELS_AR } from "@/lib/profile-form";

export default function ParentProfileStats({ profile, linkedChildrenCount = 0 }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatsCard
        variant="dark"
        title="الأبناء المربوطون"
        value={linkedChildrenCount.toLocaleString("ar-EG")}
        iconName="users"
        tone="accent"
        hint="من خلال كود الربط"
      />
      <StatsCard
        variant="dark"
        title="الدور"
        value={ROLE_LABELS_AR.parent}
        iconName="user"
        tone="blue"
      />
      <StatsCard
        variant="dark"
        title="عضو منذ"
        value={formatJoinDateAr(profile?.created_at)}
        iconName="calendarDays"
        tone="success"
      />
    </section>
  );
}
