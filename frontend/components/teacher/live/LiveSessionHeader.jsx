"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatSessionDuration } from "@/lib/live-session";

export default function LiveSessionHeader({
  session,
  startedAt,
  connectedCount,
  onEndClick
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
      <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        LIVE
      </span>
      <span className="font-bold text-primary">
        {session?.subject} — {session?.topic}
      </span>
      <span className="text-sm text-text-muted">⏱ {formatSessionDuration(elapsed)}</span>
      <span className="text-sm text-text-muted">{connectedCount}👥</span>
      <Button
        type="button"
        size="sm"
        className="mr-auto bg-danger text-white hover:bg-red-500"
        onClick={onEndClick}
      >
        إنهاء
      </Button>
    </header>
  );
}
