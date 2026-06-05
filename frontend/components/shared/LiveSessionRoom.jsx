"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { sessionsApi } from "@/lib/api";

const LiveRoom = dynamic(() => import("@/lib/livekit"), {
  ssr: false,
  loading: () => <LoadingSkeleton />
});

export default function LiveSessionRoom({ sessionId, isTeacher, sessionStart }) {
  const [roomUrl, setRoomUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const tryJoin = async () => {
          const res = await sessionsApi.join(sessionId);
          const data = res?.data ?? res;
          return {
            room_url: data?.room_url,
            token: data?.token
          };
        };

        const tryRoom = async () => {
          const res = await sessionsApi.getRoom(sessionId);
          const data = res?.data ?? res;
          return {
            room_url: data?.room_url,
            token: data?.token
          };
        };

        let payload = null;
        try {
          payload = await tryJoin();
        } catch (joinErr) {
          if (isTeacher) {
            payload = await tryRoom();
          } else {
            throw joinErr;
          }
        }

        if (!cancelled) {
          const url = payload?.room_url || "";
          const meetingToken = payload?.token || "";
          if (!url) {
            setError("رابط غرفة الفيديو غير متاح. أعد بدء الجلسة من قائمة الجلسات.");
            return;
          }
          if (!meetingToken) {
            setError(
              "لا يوجد رمز دخول للغرفة. تأكد من ضبط LIVEKIT_* على Railway ثم أعد نشر الخادم."
            );
            return;
          }
          setRoomUrl(url);
          setToken(meetingToken);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذر تحميل بيانات الغرفة من الخادم");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, isTeacher]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <main className="bg-bg p-4 md:p-6">
        <EmptyState title={error} />
      </main>
    );
  }
  if (!roomUrl) {
    return (
      <main className="bg-bg p-4 md:p-6">
        <EmptyState title="رابط الغرفة غير متاح" />
      </main>
    );
  }

  return <LiveRoom roomUrl={roomUrl} token={token} isTeacher={isTeacher} />;
}
