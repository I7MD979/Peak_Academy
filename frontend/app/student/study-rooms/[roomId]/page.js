"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { studyRoomsApi } from "@/lib/api";
import { useRoomChat } from "@/hooks/useRoomChat";
import Icon from "@/components/shared/Icon";
import { ButtonLoader, InlineLoader } from "@/components/shared/LoadingSkeleton";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentMuted
} from "@/lib/student-styles";
import { studyRoomVoicePath, studyRoomsListPath } from "@/lib/study-room-routes";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "webp"
]);

function roleLabel(role) {
  switch (role) {
    case "owner":     return "صاحب الغرفة";
    case "ta":        return "مساعد";
    case "moderator": return "مشرف";
    default:          return "طالب";
  }
}

function fileIcon(fileType = "") {
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.includes("pdf")) return "📄";
  if (fileType.includes("word") || fileType.includes("msword")) return "📝";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊";
  return "📎";
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  return `${(bytes / 1024).toFixed(0)} KB`;
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
        {!isMine && (
          <span className="text-[11px] font-bold text-auth-on-surface-variant">
            {msg.sender?.full_name || "مجهول"}
          </span>
        )}

        {msg.reply_message && (
          <div className="w-full rounded bg-auth-surface-variant/30 border-r-2 border-auth-primary/60 px-3 py-1 text-xs text-auth-on-surface-variant line-clamp-2">
            {msg.reply_message.sender?.full_name}: {msg.reply_message.content}
          </div>
        )}

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
          {msg.type === "voice_note" ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold opacity-70">🎙️ رسالة صوتية</span>
            </div>
          ) : msg.type === "file" || msg.file_url ? (
            <div className="flex flex-col gap-2">
              {msg.file_type?.startsWith("image/") && (
                <img
                  src={msg.file_url}
                  alt={msg.file_name || "صورة"}
                  className="max-w-[220px] rounded-lg"
                />
              )}
              <div className="flex items-center gap-2">
                <span className="text-lg">{fileIcon(msg.file_type)}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{msg.file_name || msg.content || "ملف"}</p>
                  {msg.file_size ? (
                    <p className="text-[10px] opacity-70">{formatFileSize(msg.file_size)}</p>
                  ) : null}
                </div>
              </div>
              <a
                href={msg.file_url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit rounded-lg bg-white/10 px-3 py-1 text-[11px] font-bold hover:bg-white/20"
              >
                تحميل
              </a>
            </div>
          ) : (
            msg.content
          )}
          {msg.is_resolved && (
            <span className="mr-2 text-[10px] font-bold text-success">✓ مُغلق</span>
          )}

          {/* Voice note player */}
          {msg.voice_url && (
            <audio
              controls
              src={msg.voice_url}
              className="mt-2 w-full max-w-[260px]"
              style={{ height: "36px" }}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-auth-on-surface-variant">
            {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
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
        {myRole === "student" && (
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

// ── Raise Hand Queue (owner/ta only) ──────────────────────────────────────────

function RaiseHandQueue({ queue, onGrant }) {
  const waiting = queue.filter((r) => r.status === "waiting");
  if (waiting.length === 0) return null;

  return (
    <div className="mx-4 mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 md:mx-6">
      <p className="mb-2 text-xs font-black text-amber-400">✋ طلبات الكلام ({waiting.length})</p>
      <div className="flex flex-col gap-2">
        {waiting.map((req) => (
          <div key={req.id} className="flex items-center justify-between">
            <span className="text-xs text-auth-on-surface">
              {req.user?.full_name || req.user_id}
            </span>
            <button
              type="button"
              onClick={() => onGrant(req.user_id)}
              className="rounded-lg bg-success/20 border border-success/30 px-3 py-1 text-xs font-bold text-success hover:bg-success/30 transition-colors"
            >
              منح الإذن
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudyRoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const roomsListPath = studyRoomsListPath(pathname);

  const [myRole, setMyRole]       = useState("student");
  const [myId, setMyId]           = useState(null);
  const [roomInfo, setRoomInfo]   = useState(null);

  const [voiceSession, setVoiceSession]   = useState(null);
  const [startingVoice, setStartingVoice] = useState(false);
  const [joiningVoice, setJoiningVoice]   = useState(false);
  const [endingVoice, setEndingVoice]     = useState(false);

  // Raise hand queue
  const [raiseHandQueue, setRaiseHandQueue] = useState([]);

  // Voice note recording
  const [recording, setRecording]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const mediaRecorderRef            = useRef(null);
  const audioChunksRef              = useRef([]);
  const fileInputRef                = useRef(null);

  const [input, setInput]     = useState("");
  const [msgType, setMsgType] = useState("text");
  const [replyTo, setReplyTo] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const messagesEndRef         = useRef(null);

  const { messages, loading, sending, error, hasMore, sendMessage, resolveQuestion, loadMore } =
    useRoomChat(roomId);

  // ── Load room info + my role + subscriptions ──────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        setMyId(user.id);

        const resolveMyRole = (membershipRole, roomTeacherId) => {
          const role = membershipRole ?? "student";
          if (roomTeacherId === user.id && role !== "owner" && role !== "ta") {
            return "owner";
          }
          return role;
        };

        // Role + room (teacher_id needed to grant owner UI for room teacher)
        Promise.all([
          supabase
            .from("study_room_members")
            .select("role")
            .eq("room_id", roomId)
            .eq("user_id", user.id)
            .is("left_at", null)
            .maybeSingle(),
          supabase
            .from("study_rooms")
            .select("id, subject, grade, status, teacher_id")
            .eq("id", roomId)
            .maybeSingle()
        ]).then(([memberRes, roomRes]) => {
          const room = roomRes.data;
          setRoomInfo(room);
          if (!room || room.status === "closed") {
            toast.error("هذه الغرفة مغلقة");
            router.replace(roomsListPath);
            return;
          }

          const role = resolveMyRole(memberRes.data?.role, room.teacher_id);
          setMyRole(role);

            // Subscribe to raise_hand_queue for owner/ta
            if (role === "owner" || role === "ta") {
              const sub = supabase
                .channel(`raise-hand-${roomId}`)
                .on("postgres_changes", {
                  event:  "*",
                  schema: "public",
                  table:  "raise_hand_queue"
                }, (payload) => {
                  if (payload.eventType === "INSERT") {
                    setRaiseHandQueue((prev) => [...prev, payload.new]);
                  } else if (payload.eventType === "UPDATE") {
                    setRaiseHandQueue((prev) =>
                      prev.map((r) => (r.id === payload.new.id ? payload.new : r))
                    );
                  }
                })
                .subscribe();

              // Load initial queue
              supabase
                .from("raise_hand_queue")
                .select("*, user:users(id, full_name)")
                .eq("status", "waiting")
                .then(({ data }) => setRaiseHandQueue(data || []));

              return () => { supabase.removeChannel(sub); };
            }
        });

        // Active voice session
        supabase
          .from("study_room_voice_sessions")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "active")
          .maybeSingle()
          .then(({ data }) => setVoiceSession(data));
      });
    });
  }, [roomId, router, roomsListPath]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Voice Note Recording ──────────────────────────────────────────────────

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("تعذر الوصول للميكروفون");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف أكبر من 10 ميجا");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
      toast.error("نوع الملف غير مدعوم");
      return;
    }

    setUploadingFile(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${roomId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("study-room-files")
        .upload(filePath, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("study-room-files")
        .getPublicUrl(filePath);

      await sendMessage({
        type: "file",
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        content: file.name
      });
      toast.success("تم رفع الملف");
    } catch (err) {
      toast.error(err.message || "تعذر رفع الملف");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleStopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setRecording(false);
    setUploading(true);
    try {
      await new Promise((res) => {
        recorder.onstop = res;
        recorder.stop();
        recorder.stream.getTracks().forEach((t) => t.stop());
      });

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const fileName = `voice-notes/${roomId}/${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("study-rooms")
        .upload(fileName, blob, { contentType: "audio/webm" });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("study-rooms")
        .getPublicUrl(fileName);

      await sendMessage({ type: "voice_note", voice_url: publicUrl, content: "🎙️" });
      toast.success("تم إرسال الرسالة الصوتية");
    } catch (err) {
      toast.error(err.message || "تعذر رفع الصوت");
    } finally {
      setUploading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

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
      router.replace(roomsListPath);
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
      const { token, livekit_url, livekit_room_id } = res.data;
      router.push(
        studyRoomVoicePath(roomId, pathname, {
          token,
          url: livekit_url,
          room: livekit_room_id
        })
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

  const handleGrantSpeak = useCallback(async (userId) => {
    if (!voiceSession) return;
    try {
      await studyRoomsApi.grantSpeak(voiceSession.id, userId);
      toast.success("تم منح إذن الكلام");
      setRaiseHandQueue((prev) =>
        prev.map((r) => (r.user_id === userId ? { ...r, status: "granted" } : r))
      );
    } catch (err) {
      toast.error(err.message || "تعذر منح الإذن");
    }
  }, [voiceSession]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-on-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-auth-outline-variant/20 bg-auth-surface px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.replace(roomsListPath)}
            className="rounded-lg p-1.5 text-auth-on-surface-variant hover:bg-auth-surface-variant/30 transition-colors"
          >
            <Icon name="arrow-right" size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black text-auth-on-surface">
              {roomInfo ? `${roomInfo.subject} · ${roomInfo.grade}` : "سؤال وجواب"}
            </h1>
            <p className="text-[11px] text-auth-on-surface-variant">{roleLabel(myRole)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className={cn(studentBtnSecondary, "text-xs py-1.5 px-3 border-danger/40 text-danger hover:bg-danger/10")}
          >
            {leaving ? "مغادرة…" : "مغادرة"}
          </button>
        </div>
      </header>

      {/* Voice session bar */}
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

      {/* Raise hand queue (owner/ta only) */}
      {(myRole === "owner" || myRole === "ta") && (
        <RaiseHandQueue queue={raiseHandQueue} onGrant={handleGrantSpeak} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 flex flex-col gap-3">
        {hasMore && (
          <button type="button" onClick={loadMore} className="mx-auto text-xs text-auth-primary hover:underline">
            تحميل رسائل أقدم
          </button>
        )}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <InlineLoader message="جاري تحميل الرسائل..." />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-danger">{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-auth-on-surface-variant">ابدأ المحادثة!</span>
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
          <button type="button" onClick={() => setReplyTo(null)} className="text-auth-on-surface-variant hover:text-auth-on-surface">
            ✕
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-auth-outline-variant/20 bg-auth-surface px-4 py-3 md:px-6">
        {/* Message type selector */}
        <div className="mb-2 flex gap-2 flex-wrap">
          {[
            { key: "text", label: "نص عادي" },
            { key: "question", label: "سؤال" },
            ...(myRole === "owner" || myRole === "ta" || myRole === "moderator"
              ? [{ key: "official_reply", label: "رد رسمي" }]
              : [])
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMsgType(key)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                msgType === key
                  ? "bg-auth-primary text-white"
                  : "bg-auth-surface-variant/30 text-auth-on-surface-variant hover:bg-auth-surface-variant/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            hidden
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || recording || sending}
            title="رفع ملف"
            className="flex-shrink-0 rounded-xl border border-auth-outline-variant/30 p-2.5 text-auth-on-surface-variant transition-colors hover:bg-auth-surface-variant/30 disabled:opacity-40"
          >
            📎
          </button>

          {/* Voice note button — owner/ta only */}
          {(myRole === "owner" || myRole === "ta") && (
            <button
              type="button"
              onClick={recording ? handleStopRecording : handleStartRecording}
              disabled={uploading}
              title={recording ? "إيقاف التسجيل وإرسال" : "تسجيل رسالة صوتية"}
              className={cn(
                "flex-shrink-0 rounded-xl p-2.5 transition-colors disabled:opacity-40",
                recording
                  ? "bg-danger/20 text-danger border border-danger/40 animate-pulse"
                  : "border border-auth-outline-variant/30 text-auth-on-surface-variant hover:bg-auth-surface-variant/30"
              )}
            >
              <Icon name={recording ? "stop-circle" : "mic"} size={18} />
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              msgType === "official_reply"
                ? "اكتب رداً رسمياً…"
                : msgType === "question"
                ? "اكتب سؤالك…"
                : "اكتب رسالة أو سؤال…"
            }
            disabled={sending || recording || uploadingFile}
            className="flex-1 rounded-xl border border-auth-outline-variant/30 bg-auth-surface-variant/20 px-4 py-2.5 text-sm text-auth-on-surface placeholder:text-auth-on-surface-variant focus:border-auth-primary/60 focus:outline-none transition-colors disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || recording || uploadingFile}
            className={cn(studentBtnPrimary, "py-2.5 px-4 disabled:opacity-40")}
          >
            {sending ? (
              <ButtonLoader />
            ) : (
              <Icon name="send" size={16} />
            )}
          </button>
        </form>

        {/* Recording status */}
        {(recording || uploading || uploadingFile) && (
          <p className="mt-1.5 text-center text-[11px] font-bold text-danger animate-pulse">
            {uploadingFile
              ? "جاري رفع الملف…"
              : uploading
              ? "جاري رفع الصوت…"
              : "● جاري التسجيل — اضغط مرة أخرى للإرسال"}
          </p>
        )}
      </div>
    </div>
  );
}
