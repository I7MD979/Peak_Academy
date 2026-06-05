"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeAr } from "@/lib/format";
import { getCountdownToStart } from "@/lib/live-session";

export default function SessionInfoCard({ session }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!session?.scheduledAt) return undefined;
    const tick = () => setCountdown(getCountdownToStart(session.scheduledAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [session?.scheduledAt]);

  if (!session) return null;

  return (
    <Card className="rounded-xl border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-primary">معلومات الجلسة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-text-muted">المادة</span>
          <span className="font-bold">{session.subject}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-text-muted">الموضوع</span>
          <span className="font-bold">{session.topic}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-text-muted">الوقت</span>
          <span className="font-bold">{formatDateTimeAr(session.scheduledAt)}</span>
        </div>
        {countdown ? (
          <div className="rounded-lg bg-accent/10 px-3 py-2 text-center text-accent">
            تبدأ خلال <strong>{countdown}</strong> دقيقة
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <span className="text-text-muted">المدة</span>
          <span className="font-bold">{session.durationMinutes} دقيقة</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-text-muted">الطلاب</span>
          <span className="font-bold">
            {session.enrolledCount}/{session.maxStudents}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
