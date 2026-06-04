"use client";

import { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";

function TeacherControls() {
  return (
    <div className="space-y-2 p-3 text-sm text-white">
      <p className="font-bold">أدوات المدرس</p>
      <button type="button" className="w-full rounded-lg bg-accent px-3 py-2 text-white">
        بدء اختبار سريع
      </button>
      <button type="button" className="w-full rounded-lg bg-white/20 px-3 py-2 text-white">
        مشاركة السبورة
      </button>
    </div>
  );
}

export default function LiveRoom({ roomUrl, token, isTeacher }) {
  const callRef = useRef(null);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!roomUrl || !callRef.current) return undefined;

    let call;
    setJoinError("");

    try {
      call = DailyIframe.createFrame(callRef.current, {
        showLeaveButton: true,
        showFullscreenButton: true,
        iframeStyle: { width: "100%", height: "100%" }
      });
      const joinOpts = token ? { url: roomUrl, token } : { url: roomUrl };
      call.join(joinOpts).catch(() => {
        setJoinError("تعذر الانضمام إلى الغرفة");
      });
    } catch {
      setJoinError("تعذر تهيئة غرفة البث");
    }

    return () => {
      call?.destroy();
    };
  }, [roomUrl, token]);

  if (joinError) {
    return (
      <main className="flex h-screen items-center justify-center bg-bg p-4">
        <p className="text-sm text-danger">{joinError}</p>
      </main>
    );
  }

  return (
    <div className="flex h-screen">
      <div ref={callRef} className="flex-1" />
      <aside className="w-80 bg-primary">{isTeacher ? <TeacherControls /> : null}</aside>
    </div>
  );
}
