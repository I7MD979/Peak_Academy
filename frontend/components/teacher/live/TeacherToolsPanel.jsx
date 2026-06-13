"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { createClient } from "@/lib/supabase/client";
import { sessionsApi } from "@/lib/api";
import QuickTestModal from "./QuickTestModal";

export default function TeacherToolsPanel({ sessionId, room }) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [raisedHands, setRaisedHands] = useState(0);
  const [mutingAll, setMutingAll] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`session:${sessionId}:raise-hand`);

    channel.on("broadcast", { event: "raise_hand" }, () => {
      setRaisedHands((n) => n + 1);
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleScreenShare = async () => {
    if (!room?.localParticipant) {
      toast.error("انتظر حتى يكتمل الاتصال بغرفة البث");
      return;
    }
    try {
      await room.localParticipant.setScreenShareEnabled(true);
      toast.success("تم بدء مشاركة الشاشة (السبورة)");
    } catch (err) {
      toast.error(err?.message || "تعذر مشاركة الشاشة");
    }
  };

  const handleMuteAll = async () => {
    try {
      setMutingAll(true);
      const res = await sessionsApi.muteAll(sessionId);
      const muted = res?.data?.muted ?? 0;
      toast.success(muted > 0 ? `تم كتم ${muted} مسار صوتي` : "لا يوجد صوت نشط للكتم");
    } catch (err) {
      toast.error(err?.message || "تعذر كتم الصوت");
    } finally {
      setMutingAll(false);
    }
  };

  const handleClearHands = () => setRaisedHands(0);

  return (
    <>
      <div className="space-y-2 p-4">
        <p className="text-sm font-bold text-auth-on-surface">أدوات المدرس</p>
        <Button
          type="button"
          className="w-full"
          disabled={!room}
          onClick={() => setQuizOpen(true)}
        >
          <Icon name="edit" size={16} />
          اختبار سريع
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled={!room} onClick={handleScreenShare}>
          <Icon name="monitor" size={16} />
          مشاركة سبورة
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!room || mutingAll}
          onClick={handleMuteAll}
        >
          <Icon name="micOff" size={16} />
          {mutingAll ? "جاري الكتم..." : "كتم الكل"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={handleClearHands}>
          <Icon name="hand" size={16} />
          رفع الأيدي ({raisedHands})
        </Button>
      </div>
      <QuickTestModal open={quizOpen} sessionId={sessionId} onClose={() => setQuizOpen(false)} />
    </>
  );
}
