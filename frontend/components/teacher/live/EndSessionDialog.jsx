"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatSessionDuration } from "@/lib/live-session";

export default function EndSessionDialog({
  open,
  connectedCount,
  startedAt,
  loading,
  onClose,
  onConfirm
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open || !startedAt) return undefined;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, startedAt]);

  if (!open) return null;

  const minutes = Math.floor(elapsedSeconds / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-auth-outline-variant/40 bg-auth-surface-high p-6 shadow-xl" dir="rtl">
        <h2 className="text-lg font-black text-primary">إنهاء الجلسة؟</h2>
        <ul className="mt-3 space-y-1 text-sm text-auth-on-surface-variant">
          <li>• {connectedCount} طلاب متصلين دلوقتي</li>
          <li>• مدة الجلسة: {formatSessionDuration(elapsedSeconds)} ({minutes} دقيقة)</li>
        </ul>
        <div className="mt-6 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={loading}
            onClick={onClose}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="flex-1 bg-danger text-white hover:bg-red-500"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "جاري الإنهاء..." : "إنهاء الجلسة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
