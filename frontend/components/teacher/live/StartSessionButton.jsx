"use client";

import { Button } from "@/components/ui/button";
import { getStartAvailability } from "@/lib/teacher-sessions";

export default function StartSessionButton({
  session,
  connectedCount = 0,
  loading = false,
  onStart
}) {
  const startInfo = session
    ? getStartAvailability({ status: "scheduled", scheduled_at: session.scheduledAt })
    : { canStart: false, reason: "" };

  const disabled =
    loading || !startInfo.canStart || connectedCount < 1 || session?.enrolledCount < 1;

  let hint = "";
  if (!startInfo.canStart) hint = startInfo.reason;
  else if (connectedCount < 1) hint = "انتظر حتى يتصل طالب واحد على الأقل";
  else if (session?.enrolledCount < 1) hint = "لا يوجد طلاب مسجلون";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="h-12 w-full rounded-xl bg-accent text-base font-bold text-white hover:bg-orange-500"
        disabled={disabled}
        onClick={onStart}
      >
        {loading ? "جاري بدء الجلسة..." : "ابدأ الجلسة ▶"}
      </Button>
      {hint ? <p className="text-center text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
