"use client";

import { Button } from "@/components/ui/button";

function StudentAvatar({ name }) {
  const initial = (name || "ط").trim().slice(0, 1);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-auth-outline-variant/40 bg-muted text-xs font-bold">
      {initial}
    </div>
  );
}

export default function AttendancePanel({ participants, maxStudents, call }) {
  const connected = participants?.length || 0;

  const muteOne = async (participantKey) => {
    if (!call || !participantKey) return;
    try {
      await call.updateParticipant(participantKey, { setAudio: false });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="border-t border-auth-outline-variant/40 p-4">
      <p className="mb-3 text-sm font-bold text-primary">
        الحضور ({connected}/{maxStudents})
      </p>
      {participants?.length ? (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li
              key={p.id || p.session_id}
              className="flex items-center justify-between gap-2 rounded-lg border border-auth-outline-variant/40 bg-auth-surface-low px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <StudentAvatar name={p.name} />
                <div>
                  <p className="text-xs font-bold">{p.name}</p>
                  <p className="text-[10px] text-auth-on-surface-variant">
                    {p.audio ? "🎤 يتكلم" : "صامت"} · {p.video ? "📹" : "بدون فيديو"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-success text-xs">✓</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => muteOne(p.participantKey)}
                >
                  كتم
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-auth-on-surface-variant">لا يوجد طلاب متصلين بعد</p>
      )}
    </div>
  );
}
