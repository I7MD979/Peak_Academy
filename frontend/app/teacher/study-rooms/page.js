"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PageContainer from "@/components/shared/PageContainer";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import {
  studentBtnPrimary,
  studentCardSolid,
  studentMuted
} from "@/lib/student-styles";

const SUBJECT_AR = {
  math: "رياضيات", physics: "فيزياء", chemistry: "كيمياء",
  biology: "أحياء", arabic: "عربي", english: "إنجليزي",
  history: "تاريخ", geography: "جغرافيا", general: "عام"
};

const GRADE_AR = {
  first: "أول ثانوي", second: "تاني ثانوي", third: "تالت ثانوي"
};

export default function TeacherStudyRoomsPage() {
  const router = useRouter();
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: dbErr } = await supabase
        .from("study_rooms")
        .select(`
          id, subject, grade, status, capacity,
          members:study_room_members(count),
          voice_sessions:study_room_voice_sessions(id, status)
        `)
        .eq("teacher_id", user.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false });

      if (dbErr) throw dbErr;
      setRooms(data || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل غرفك");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <PageContainer>
        <SectionLoader message="جاري تحميل غرفك…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminPageHeader
        eyebrow="غرف المذاكرة"
        title="غرفك الدراسية"
        subtitle="تابع الطلاب وابدأ جلسات صوتية"
        actions={[{ label: "تحديث", icon: "refresh", variant: "secondary", onClick: load }]}
      />

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 border border-danger/30 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {rooms.length === 0 ? (
        <div className={cn(studentCardSolid, "p-8 text-center")}>
          <p className="text-lg font-black text-auth-on-surface mb-2">مفيش غرف بعد</p>
          <p className={cn("text-sm mb-4", studentMuted)}>
            لما طالب يدخل غرفة وانت مرتبط بيها كمدرس، هتظهر هنا
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => {
            const memberCount = room.members?.[0]?.count ?? 0;
            const hasLiveVoice = room.voice_sessions?.some((s) => s.status === "active");

            return (
              <div
                key={room.id}
                className={cn(
                  studentCardSolid,
                  "p-5 flex flex-col gap-4 cursor-pointer hover:border-auth-outline transition-colors"
                )}
                onClick={() => router.push(`/student/study-rooms/${room.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-auth-on-surface text-base">
                      {SUBJECT_AR[room.subject] || room.subject}
                    </h3>
                    <p className={cn("text-sm mt-0.5", studentMuted)}>
                      {GRADE_AR[room.grade] || room.grade}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      room.status === "active"
                        ? "bg-success/20 text-success"
                        : "bg-auth-surface-variant/40 text-auth-on-surface-variant"
                    )}>
                      {room.status === "active" ? "نشطة" : "مفتوحة"}
                    </span>
                    {hasLiveVoice && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        صوت مباشر
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={cn("text-sm", studentMuted)}>
                    {memberCount} طالب داخل الغرفة
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/student/study-rooms/${room.id}`);
                    }}
                    className={cn(studentBtnPrimary, "text-xs py-1.5 px-3")}
                  >
                    دخول الغرفة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
