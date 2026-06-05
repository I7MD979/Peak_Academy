"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sessionsApi } from "@/lib/api";

function StudentAvatar({ name, url }) {
  const initial = (name || "ط").trim().slice(0, 1);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-text-muted">{initial}</span>
      )}
    </div>
  );
}

export default function StudentsWaitingList({ sessionId, onAllReady, onCount }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await sessionsApi.waitingStudents(sessionId);
        const list = res?.data?.students || [];
        if (!cancelled) {
          setStudents(list);
          const connected = list.filter((s) => s.isConnected).length;
          onCount?.(connected);
        }
        if (!cancelled && onAllReady && list.length > 0 && list.every((s) => s.isConnected)) {
          onAllReady();
        }
      } catch {
        if (!cancelled) {
          setStudents([]);
          onCount?.(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId, onAllReady, onCount]);

  const connected = students.filter((s) => s.isConnected).length;

  return (
    <Card className="flex h-full flex-col rounded-xl border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-primary">الطلاب المنتظرين</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {loading ? (
          <p className="text-sm text-text-muted">جاري التحميل...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-text-muted">لا يوجد طلاب مسجلون بعد</p>
        ) : (
          <ul className="space-y-2">
            {students.map((student) => (
              <li
                key={student.studentId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <StudentAvatar name={student.name} url={student.avatar} />
                  <span className="text-sm font-bold">{student.name}</span>
                </div>
                <span
                  className={`text-xs font-bold ${student.isConnected ? "text-success" : "text-text-muted"}`}
                >
                  {student.isConnected ? "✓ جاهز" : "⏳ لسه"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto border-t border-border pt-3 text-center text-sm text-text-muted">
          <strong className="text-primary">{connected}</strong> من {students.length} طلاب جاهزين
        </p>
      </CardContent>
    </Card>
  );
}
