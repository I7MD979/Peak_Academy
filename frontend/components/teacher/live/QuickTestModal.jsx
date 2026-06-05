"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function QuickTestModal({ open, sessionId, onClose }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!question.trim()) {
      toast.error("اكتب نص السؤال");
      return;
    }
    const filled = options.map((o) => o.trim()).filter(Boolean);
    if (filled.length < 2) {
      toast.error("أدخل خيارين على الأقل");
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const channel = supabase.channel(`session:${sessionId}:tools`);
      await new Promise((resolve, reject) => {
        channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const { error: sendError } = await channel.send({
              type: "broadcast",
              event: "quick_quiz",
              payload: { question: question.trim(), options: filled, sent_at: Date.now() }
            });
            supabase.removeChannel(channel);
            if (sendError) reject(sendError);
            else resolve();
          }
          if (status === "CHANNEL_ERROR") reject(new Error("تعذر الاتصال بقناة الجلسة"));
        });
      });
      toast.success("تم إرسال الاختبار للطلاب");
      onClose();
      setQuestion("");
      setOptions(["", "", "", ""]);
    } catch (err) {
      toast.error(err?.message || "تعذر إرسال الاختبار");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" dir="rtl">
        <h2 className="text-lg font-black text-primary">اختبار سريع</h2>
        <div className="mt-4 space-y-3">
          <Input
            placeholder="نص السؤال"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((opt, i) => (
            <Input
              key={i}
              placeholder={`الخيار ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
            />
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" className="flex-1 bg-accent text-white" disabled={sending} onClick={handleSend}>
            {sending ? "جاري الإرسال..." : "إرسال للطلاب"}
          </Button>
        </div>
      </div>
    </div>
  );
}
