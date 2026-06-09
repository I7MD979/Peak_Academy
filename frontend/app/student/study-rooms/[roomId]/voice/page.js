"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

function VoiceRoomContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const { roomId } = useParams();

  const token     = params.get("token");
  const serverUrl = params.get("url");
  const roomName  = params.get("room");

  const [LiveKitRoom, setLiveKitRoom] = useState(null);
  const [AudioConference, setAudioConference] = useState(null);
  const [sdkReady, setSdkReady]       = useState(false);
  const [sdkMissing, setSdkMissing]   = useState(false);
  const [connected, setConnected]     = useState(false);

  useEffect(() => {
    Promise.all([
      import("@livekit/components-react").catch(() => null),
      import("livekit-client").catch(() => null)
    ]).then(([lkMod]) => {
      if (lkMod?.LiveKitRoom && lkMod?.AudioConference) {
        setLiveKitRoom(() => lkMod.LiveKitRoom);
        setAudioConference(() => lkMod.AudioConference);
        setSdkReady(true);
      } else {
        setSdkMissing(true);
      }
    });
  }, []);

  if (!token || !serverUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-auth-background p-6">
        <div className="text-center">
          <p className="text-auth-on-surface-variant mb-4">بيانات الجلسة غير مكتملة</p>
          <button
            onClick={() => router.back()}
            className="text-sm text-auth-primary hover:underline"
          >
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (sdkMissing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-auth-background p-6">
        <div className="rounded-2xl border border-auth-outline-variant/30 bg-auth-surface p-6 text-center max-w-sm w-full">
          <div className="mb-4 text-4xl">🎙️</div>
          <h2 className="text-lg font-black text-auth-on-surface mb-2">جلسة صوتية نشطة</h2>
          <p className="text-sm text-auth-on-surface-variant mb-1">غرفة: {roomName}</p>
          <p className="text-xs text-auth-on-surface-variant mb-3">
            لتشغيل الصوت، ثبّت حزمة LiveKit:
          </p>
          <code className="block rounded-lg bg-auth-surface-variant/30 px-3 py-2 text-xs text-auth-on-surface mb-4 text-left" dir="ltr">
            npm install @livekit/components-react livekit-client
          </code>
          <button
            onClick={() => router.back()}
            className="w-full rounded-xl bg-danger/20 border border-danger/30 py-2 text-sm font-bold text-danger"
          >
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-auth-background">
        <span className="text-auth-on-surface-variant text-sm">جاري تحميل الجلسة الصوتية…</span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onConnected={() => setConnected(true)}
      onDisconnected={() => router.back()}
      style={{ height: "100dvh" }}
    >
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-auth-background p-6">
        <div className="text-center">
          <div className="mb-3 text-3xl">🎙️</div>
          <h2 className="text-lg font-black text-auth-on-surface">جلسة صوتية مباشرة</h2>
          <p className="text-sm text-auth-on-surface-variant mt-1">{roomName}</p>
          {connected && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-success">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              متصل
            </span>
          )}
        </div>

        {/* AudioConference handles mic controls automatically */}
        <div className="w-full max-w-sm">
          <AudioConference />
        </div>

        <button
          onClick={() => router.back()}
          className="rounded-full bg-danger px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-danger/90 transition-colors"
        >
          قطع الاتصال
        </button>
      </div>
    </LiveKitRoom>
  );
}

export default function VoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-auth-background">
          <span className="text-auth-on-surface-variant text-sm">جاري التحميل…</span>
        </div>
      }
    >
      <VoiceRoomContent />
    </Suspense>
  );
}
