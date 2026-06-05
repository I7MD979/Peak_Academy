"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import QuickTestModal from "./QuickTestModal";

export default function TeacherToolsPanel({ sessionId, call }) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [raisedHands, setRaisedHands] = useState(0);

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
    if (!call) {
      toast.error("انتظر حتى يكتمل الاتصال بغرفة البث");
      return;
    }
    try {
      await call.startScreenShare();
      toast.success("تم بدء مشاركة الشاشة (السبورة)");
    } catch (err) {
      toast.error(err?.message || "تعذر مشاركة الشاشة");
    }
  };

  const handleMuteAll = async () => {
    if (!call) return;
    try {
      const participants = call.participants?.() || {};
      for (const [id, p] of Object.entries(participants)) {
        if (!p.local) await call.updateParticipant(id, { setAudio: false });
      }
      toast.success("تم كتم الجميع");
    } catch (err) {
      toast.error(err?.message || "تعذر كتم الصوت");
    }
  };

  const handleClearHands = () => setRaisedHands(0);

  return (
    <>
      <div className="space-y-2 p-4">
        <p className="text-sm font-bold text-primary">أدوات المدرس</p>
        <Button
          type="button"
          className="w-full bg-accent text-white"
          disabled={!call}
          onClick={() => setQuizOpen(true)}
        >
          📝 اختبار سريع
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled={!call} onClick={handleScreenShare}>
          🖥 مشاركة سبورة
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled={!call} onClick={handleMuteAll}>
          🔇 كتم الكل
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={handleClearHands}>
          ✋ رفع الأيدي ({raisedHands})
        </Button>
      </div>
      <QuickTestModal open={quizOpen} sessionId={sessionId} onClose={() => setQuizOpen(false)} />
    </>
  );
}
