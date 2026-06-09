"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { studyRoomsApi } from "@/lib/api";
import { useRoomChat } from "@/hooks/useRoomChat";
import Icon from "@/components/shared/Icon";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentMuted,
  studentPage
} from "@/lib/student-styles";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_LABELS = { general: "الدردشة العامة", qa: "الأسئلة والأجوبة" };

function roleLabel(role) {
  switch (role) {
    case "owner":    return "صاحب الغرفة";
    case "ta":       return "مساعد";
    case "moderator":return "مشرف";
    default:         return "طالب";
  }
}

function roleBadgeColor(role) {
  switch (role) {
    case "owner":    return "bg-amber-500/20 text-amber-400";
    case "ta":       return "bg-blue-500/20 text-blue-400";
    case "moderator":return "bg-purple-500/20 text-purple-400";
    default:         return "bg-auth-surface-variant/40 text-auth-on-surface-variant";
  }
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, myId, myRole, onResolve }) {
  const isMine = msg.sender_id === myId;
  const canResolve =
    (myRole === "owner" || myRole === "ta" || myRole === "moderator") &&
    msg.type === "question" &&
    !msg.is_resolved;

  return (
    <div className={cn("flex gap-2", isMine ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-full bg-auth-surface-variant flex items-center justify-center text-xs font-bold text-auth-on-surface">
        {(msg.sender?.full_name || "؟")[0]}
      </div>

      <div className={cn("max-w-[75%] flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
        {/* Name + role */}
        {!isMine && (
          <span className="text-[11px] font-bold text-auth-on-surface-variant">
            {msg.sender?.full_name || "مجهول"}
          </span>
        )}

        {/* Reply context */}
        {msg.reply_message && (
          <div className="w-full rounded bg-auth-surface-variant/30 border-r-2 border-auth-primary/60 px-3 py-1 text-xs text-auth-on-surface-variant line-clamp-2">
            {msg.reply_message.sender?.full_name}: {msg.reply_message.content}
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isMine
              ? "bg-auth-primary text-white rounded-tr-sm"
              : msg.type === "official_reply"
              ? "bg-amber-500/20 border border-amber-500/40 text-auth-on-surface rounded-tl-sm"
              : msg.type === "question"
              ? "bg-blue-500/15 border border-blue-500/30 text-auth-on-surface rounded-tl-sm"
              : "bg-auth-surface-variant/40 text-auth-on-surface rounded-tl-sm"
          )}
        >
          {msg.type === "question" && (
            <span className="mb-1 block text-[10px] font-black text-blue-400">سؤال</span>
          )}
          {msg.type === "official_reply" && (
            <span className="mb-1 block text-[10px] font-black text-amber-400">رد رسمي</span>
          )}
          {msg.content}
          {msg.is_resolved && (
            <span className="mr-2 text-[10px] font-bold text-success">✓ مُغلق</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-auth-on-surface-variant">
            {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
              hour:   "2-digit",
              minute: "2-digit"
            })}
          </span>
          {canResolve && (
            <button
              type="button"
              onClick={() => onResolve(msg.id)}
              className="text-[10px] text-success hover:underline"
            >
              إغلاق السؤال
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Voice session banner ──────────────────────────────────────────────────────

function VoiceSessionBar({ session, myRole, onJoin, onEnd, onRaiseHand, joining, ending }) {
  if (!session) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="text-sm font-bold text-success">جلسة صوتية نشطة</span>
      </div>

      <div className="flex items-center gap-2">
        {(myRole === "student") && (
          <button
            type="button"
            onClick={onRaiseHand}
            className="rounded-lg border border-auth-outline-variant/40 px-3 py-1.5 text-xs font-bold text-auth-on-surface hover:bg-auth-surface-variant/30 transition-colors"
          >
            ✋ رفع يد
          </button>
        )}

        <button
          type="button"
          onClick={onJoin}
          disabled={joining}
          className={cn(studentBtnPrimary, "text-xs py-1.5 px-3")}
        >
          {joining ? "جاري الانضمام…" : "انضمام للصوت"}
        </button>

        {(myRole === "owner" || myRole === "moderator") && (
          <button
            type="button"
            onClick={onEnd}
            disabled={ending}
            className="rounded-lg bg-danger/20 border border-danger/30 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/30 transition-colors"
          >
            {ending ? "جاري الإنهاء…" : "إنهاء الجلسة"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudyRoomPage() {
  const { roomId } = useParams();
  const router     = useRouter();

  const [channel, setChannel]   = useState("general");
  const [myRole, setMyRole]     = useState("student");
  const [myId, setMyId]         = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);

  const [voiceSession, setVoiceSession] = useState(null);
  const [startingVoice, setStartingVoice] = useState(false);
  const [joiningVoice, setJoiningVoice]   = useState(false);
  const [endingVoice, setEndingVoice]     = useState(false);

  const [input, setInput]         = useState("");
  const [msgType, setMsgType]     = useState("text");
  const [replyTo, setReplyTo]     = useState(null);
  const [leaving, setLeaving]     = useState(false);
  const messagesEndRef             = useRef(null);

  const { messages, loading, sending, error, hasMore, sendMessage, resolveQuestion, loadMore } =
    useRoomChat(roomId, channel);

  // ── Load room info + my role ────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        setMyId(user.id);

        // Fetch member role
        supabase
          .from("study_room_members")
          .select("role")
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .is("left_at", null)
          .maybeSingle()
          .then(({ data }) => {
            setMyRole(data?.role ?? "student");
          });

        // Fetch room info
        supabase
          .from("study_rooms")
          .select("id, subject, grade, status")
          .eq("id", roomId)
          .maybeSingle()
          .then(({ data }) => {
            setRoomInfo(data);
            if (!data || data.status === "closed") {
              toast.error("هذه الغرفة مغلقة");
              router.replace("/student/study-rooms");
            }
          });

        // Fetch active voice session
        supabase
          .from("study_room_voice_sessions")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "active")
          .maybeSingle()
          .then(({ data }) => setVoiceSession(data));
      });
    });
  }, [roomId, router]);

  // ── Auto-scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setReplyTo(null);
    try {
      await sendMessage({
        type:     msgType,
        content:  text,
        reply_to: replyTo?.id ?? undefined
      });
    } catch (err) {
      toast.error(err.message || "تعذر إرسال الرسالة");
      setInput(text);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await studyRoomsApi.leave(roomId);
      toast.success("تم مغادرة الغرفة");
      router.replace("/student/study-rooms");
    } catch (err) {
      toast.error(err.message || "تعذر مغادرة الغرفة");
    } finally {
      setLeaving(false);
    }
  };

  const handleStartVoice = async () => {
    setStartingVoice(true);
    try {
      const res = await studyRoomsApi.startVoiceSession(roomId);
      setVoiceSession(res.data?.session);
      toast.success("تم بدء الجلسة الصوتية");
    } catch (err) {
      toast.error(err.message || "تعذر بدء الجلسة");
    } finally {
      setStartingVoice(false);
    }
  };

  const handleJoinVoice = async () => {
    if (!voiceSession) return;
    setJoiningVoice(true);
    try {
      const res = await studyRoomsApi.joinVoiceSession(voiceSession.id);
      // Open LiveKit in new tab or handle via LiveKit React SDK
      window.open(
        `/student/study-rooms/${roomId}/voice?token=${encodeURIComponent(res.data.token)}&url=${encodeURIComponent(res.data.livekit_url)}&room=${encodeURIComponent(res.data.livekit_room_id)}`,
        "_blank"
      );
    } catch (err) {
      toast.error(err.message || "تعذر الانضمام للجلسة");
    } finally {
      setJoiningVoice(false);
    }
  };

  const handleEndVoice = async () => {
    if (!voiceSession) return;
    setEndingVoice(true);
    try {
      await studyRoomsApi.endVoiceSession(voiceSession.id);
      setVoiceSession(null);
      toast.success("تم إنهاء الجلسة الصوتية");
    } catch (err) {
      toast.error(err.message || "تعذر إنهاء الجلسة");
    } finally {
      setEndingVoice(false);
    }
  };

  const handleRaiseHand = async () => {
    if (!voiceSession) return;
    try {
      await studyRoomsApi.raiseHand(voiceSession.id);
      toast.success("تم رفع يدك — انتظر الإذن");
    } catch (err) {
      toast.error(err.message || "تعذر رفع اليد");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={cn(studentPage, "flex flex-col h-screen overflow-hidden")}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-auth-outline-variant/20 bg-auth-surface px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.replace("/student/study-rooms")}
            className="rounded-lg p-1.5 text-auth-on-surface-variant hover:bg-auth-surface-variant/30 transition-colors"
          >
            <Icon name="arrow-right" size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black text-auth-on-surface">
              {roomInfo ? `${roomInfo.subject} · ${roomInfo.grade}` : "غرفة المذاكرة"}
            </h1>
            <p className="text-[11px] text-auth-on-surface-variant">
              {roleLabel(myRole)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Start voice session — owner only */}
          {myRole === "owner" && !voiceSession && (
            <button
              type="button"
              onClick={handleStartVoice}
              disabled={startingVoice}
              className={cn(studentBtnPrimary, "text-xs py-1.5 px-3 gap-1")}
            >
              <Icon name="mic" size={14} />
              {startingVoice ? "جاري البدء…" : "بدء جلسة صوتية"}
            </button>
          )}

          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving}
            className={cn(
              studentBtnSecondary,
              "text-xs py-1.5 px-3 border-danger/40 text-danger hover:bg-danger/10"
            )}
          >
            {leaving ? "مغادرة…" : "مغادرة"}
          </button>
        </div>
      </header>

      {/* Voice session banner */}
      <div className="px-4 pt-3 md:px-6">
        <VoiceSessionBar
          session={voiceSession}
          myRole={myRole}
          onJoin={handleJoinVoice}
          onEnd={handleEndVoice}
          onRaiseHand={handleRaiseHand}
          joining={joiningVoice}
          ending={endingVoice}
        />
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1 border-b border-auth-outline-variant/20 px-4 md:px-6 mt-3">
        {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setChannel(key)}
            className={cn(
              "px-4 py-2 text-sm font-bold transition-colors border-b-2 -mb-px",
              channel === key
                ? "border-auth-primary text-auth-primary"
                : "border-transparent text-auth-on-surface-variant hover:text-auth-on-surface"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 flex flex-col gap-3">
        {/* Load more */}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            className="mx-auto text-xs text-auth-primary hover:underline"
          >
            تحميل رسائل أقدم
          </button>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-auth-on-surface-variant">جاري التحميل…</span>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-danger">{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-auth-on-surface-variant">
              {channel === "qa" ? "لا توجد أسئلة بعد" : "ابدأ المحادثة!"}
            </span>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              myId={myId}
              myRole={myRole}
              onResolve={resolveQuestion}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="mx-4 mb-1 flex items-center justify-between rounded-xl border border-auth-outline-variant/30 bg-auth-surface-variant/20 px-3 py-2 text-xs md:mx-6">
          <span className="text-auth-on-surface-variant">
            رد على: {replyTo.sender?.full_name} — {replyTo.content?.slice(0, 60)}
          </span>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-auth-on-surface-variant hover:text-auth-on-surface"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-auth-outline-variant/20 bg-auth-surface px-4 py-3 md:px-6">
        {/* Message type selector (owner/ta only) */}
        {(myRole === "owner" || myRole === "ta") && (
          <div className="mb-2 flex gap-2">
            {["text", "official_reply"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMsgType(t)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                  msgType === t
                    ? "bg-auth-primary text-white"
                    : "bg-auth-surface-variant/30 text-auth-on-surface-variant hover:bg-auth-surface-variant/50"
                )}
              >
                {t === "text" ? "نص عادي" : "رد رسمي"}
              </button>
            ))}
            {channel === "qa" && (
              <button
                key="question"
                type="button"
                onClick={() => setMsgType("question")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                  msgType === "question"
                    ? "bg-auth-primary text-white"
                    : "bg-auth-surface-variant/30 text-auth-on-surface-variant hover:bg-auth-surface-variant/50"
                )}
              >
                سؤال
              </button>
            )}
          </div>
        )}

        {/* Student Q&A channel: only allow "question" type */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              channel === "qa"
                ? "اكتب سؤالك…"
                : msgType === "official_reply"
                ? "اكتب رداً رسمياً…"
                : "اكتب رسالة…"
            }
            disabled={sending}
            className="flex-1 rounded-xl border border-auth-outline-variant/30 bg-auth-surface-variant/20 px-4 py-2.5 text-sm text-auth-on-surface placeholder:text-auth-on-surface-variant focus:border-auth-primary/60 focus:outline-none transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className={cn(
              studentBtnPrimary,
              "py-2.5 px-4 disabled:opacity-40"
            )}
          >
            {sending ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Icon name="send" size={16} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
