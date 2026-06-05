"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import SessionInfoCard from "./SessionInfoCard";
import StudentsWaitingList from "./StudentsWaitingList";
import CameraPreview from "./CameraPreview";
import StartSessionButton from "./StartSessionButton";

export default function WaitingRoom({ session, sessionId, onStart }) {
  const [starting, setStarting] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);

  const handleStart = async () => {
    try {
      setStarting(true);
      const result = await onStart();
      if (result?.room_warning) toast.warning(result.room_warning);
      toast.success("تم بدء الجلسة");
    } catch (err) {
      toast.error(err?.message || "تعذر بدء الجلسة");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-primary">غرفة الانتظار</h1>
          <p className="text-sm text-text-muted">راجع الإعدادات ثم ابدأ الجلسة عندما يكون الطلاب جاهزين</p>
        </div>
        <Link href={`/teacher/sessions/${sessionId}`} className="text-sm font-bold text-accent">
          تفاصيل الجلسة
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SessionInfoCard session={session} />
          <CameraPreview />
          <StartSessionButton
            session={session}
            connectedCount={connectedCount}
            loading={starting}
            onStart={handleStart}
          />
        </div>
        <StudentsWaitingList sessionId={sessionId} onCount={setConnectedCount} />
      </div>
    </div>
  );
}
