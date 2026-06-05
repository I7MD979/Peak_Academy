"use client";

import { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { Skeleton } from "@/components/ui/skeleton";

function dailyErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err.errorMsg || err.error?.msg || err.message || err.reason || fallback;
}

async function destroyExistingCall() {
  try {
    const existing = DailyIframe.getCallInstance?.();
    if (!existing) return;
    await existing.leave().catch(() => {});
    await existing.destroy().catch(() => {});
  } catch {
    /* ignore */
  }
}

export default function DailyVideoRoom({ roomUrl, token, onCallReady, onParticipantsChange }) {
  const containerRef = useRef(null);
  const callRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomUrl || !token || !containerRef.current) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const syncParticipants = (call) => {
      const participants = call.participants?.() || {};
      const list = Object.entries(participants)
        .filter(([, p]) => !p.local)
        .map(([participantKey, p]) => ({
          id: p.user_id || p.session_id || participantKey,
          participantKey,
          name: p.user_name || "مشارك",
          audio: p.audio,
          video: p.video
        }));
      onParticipantsChange?.(list);
    };

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        await destroyExistingCall();
        if (cancelled || !containerRef.current) return;

        const call = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: { width: "100%", height: "100%", border: "none" }
        });
        callRef.current = call;

        const onJoined = () => {
          if (!cancelled) {
            setLoading(false);
            onCallReady?.(call);
            syncParticipants(call);
          }
        };
        const onParticipantUpdated = () => syncParticipants(call);
        const onParticipantJoined = () => syncParticipants(call);
        const onParticipantLeft = () => syncParticipants(call);
        const onError = (ev) => {
          if (!cancelled) {
            setError(dailyErrorMessage(ev, "تعذر تحميل غرفة الفيديو"));
            setLoading(false);
          }
        };

        call.on("joined-meeting", onJoined);
        call.on("participant-updated", onParticipantUpdated);
        call.on("participant-joined", onParticipantJoined);
        call.on("participant-left", onParticipantLeft);
        call.on("error", onError);

        await call.join({ url: roomUrl, token });
        call._peakHandlers = {
          onJoined,
          onParticipantUpdated,
          onParticipantJoined,
          onParticipantLeft,
          onError
        };
      } catch (err) {
        if (!cancelled) {
          setError(dailyErrorMessage(err, "تعذر الاتصال بغرفة Daily.co"));
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      const call = callRef.current;
      callRef.current = null;
      onCallReady?.(null);
      if (call) {
        const h = call._peakHandlers;
        if (h) {
          call.off("joined-meeting", h.onJoined);
          call.off("participant-updated", h.onParticipantUpdated);
          call.off("participant-joined", h.onParticipantJoined);
          call.off("participant-left", h.onParticipantLeft);
          call.off("error", h.onError);
        }
        call.leave().catch(() => {});
        call.destroy().catch(() => {});
      }
    };
  }, [roomUrl, token, onCallReady, onParticipantsChange]);

  if (error) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="max-w-md text-center text-sm text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-border bg-black">
      {loading ? (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 bg-bg p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="flex-1 w-full" />
          <p className="text-center text-sm text-text-muted">جاري تحميل غرفة البث...</p>
        </div>
      ) : null}
      <div ref={containerRef} className="h-full min-h-[320px] w-full" />
    </div>
  );
}
