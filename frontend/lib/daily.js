"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { toast } from "sonner";

export const DailyCallContext = createContext(null);

function TeacherControls() {
  const call = useContext(DailyCallContext);

  const handleScreenShare = async () => {
    if (!call) {
      toast.error("انتظر حتى يكتمل الاتصال بغرفة البث");
      return;
    }
    try {
      await call.startScreenShare();
      toast.success("تم بدء مشاركة الشاشة (السبورة)");
    } catch (err) {
      toast.error(
        err?.message || "تعذر مشاركة الشاشة. اسمح بمشاركة الشاشة من المتصفح ثم أعد المحاولة."
      );
    }
  };

  const handleQuickTest = () => {
    toast.info("الاختبار السريع قيد التطوير وسيُضاف في تحديث قريب");
  };

  return (
    <div className="space-y-2 p-3 text-sm text-white">
      <p className="font-bold">أدوات المدرس</p>
      <button
        type="button"
        className="w-full rounded-lg bg-accent px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        disabled={!call}
        onClick={handleQuickTest}
      >
        بدء اختبار سريع
      </button>
      <button
        type="button"
        className="w-full rounded-lg bg-white/20 px-3 py-2 text-white transition-opacity hover:bg-white/30 disabled:opacity-50"
        disabled={!call}
        onClick={handleScreenShare}
      >
        مشاركة السبورة
      </button>
      <p className="text-xs text-white/70">
        السبورة = مشاركة شاشة المتصفح داخل البث. الاختبار السريع قريباً.
      </p>
    </div>
  );
}

function dailyErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return (
    err.errorMsg ||
    err.error?.msg ||
    err.message ||
    err.reason ||
    fallback
  );
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

export default function LiveRoom({ roomUrl, token, isTeacher }) {
  const callRef = useRef(null);
  const callInstanceRef = useRef(null);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(true);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (!roomUrl || !token || !callRef.current) {
      setJoining(false);
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      setJoining(true);
      setJoinError("");
      setActiveCall(null);

      try {
        await destroyExistingCall();

        if (cancelled || !callRef.current) return;

        const call = DailyIframe.createFrame(callRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: { width: "100%", height: "100%" }
        });
        callInstanceRef.current = call;

        const onError = (ev) => {
          if (cancelled) return;
          setJoinError(`تعذر الانضمام إلى الغرفة: ${dailyErrorMessage(ev, "خطأ في الاتصال")}`);
          setJoining(false);
          setActiveCall(null);
        };
        const onLeft = () => {
          if (!cancelled) {
            setJoining(false);
            setActiveCall(null);
          }
        };

        call.on("error", onError);
        call.on("left-meeting", onLeft);

        await call.join({ url: roomUrl, token });

        if (!cancelled) {
          setJoining(false);
          setActiveCall(call);
        }

        callInstanceRef.current._peakHandlers = { onError, onLeft };
      } catch (err) {
        if (!cancelled) {
          setJoinError(
            `تعذر الانضمام إلى الغرفة: ${dailyErrorMessage(err, "تحقق من الرابط ورمز الدخول")}`
          );
          setJoining(false);
          setActiveCall(null);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      const call = callInstanceRef.current;
      callInstanceRef.current = null;
      setActiveCall(null);
      if (call) {
        const handlers = call._peakHandlers;
        if (handlers) {
          call.off("error", handlers.onError);
          call.off("left-meeting", handlers.onLeft);
        }
        call
          .leave()
          .catch(() => {})
          .finally(() => {
            call.destroy().catch(() => {});
          });
      }
    };
  }, [roomUrl, token]);

  if (joinError) {
    return (
      <main className="flex h-screen items-center justify-center bg-bg p-4">
        <p className="max-w-md text-center text-sm text-danger">{joinError}</p>
      </main>
    );
  }

  if (joining) {
    return (
      <main className="flex h-screen items-center justify-center bg-bg p-4">
        <p className="text-sm text-text-muted">جاري الاتصال بغرفة البث...</p>
      </main>
    );
  }

  return (
    <DailyCallContext.Provider value={activeCall}>
      <div className="flex h-screen">
        <div ref={callRef} className="flex-1" />
        <aside className="w-80 bg-primary">{isTeacher ? <TeacherControls /> : null}</aside>
      </div>
    </DailyCallContext.Provider>
  );
}
