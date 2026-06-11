"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PageContainer from "@/components/shared/PageContainer";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { teacherBtnPrimary, teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { PROFILE_UPDATED } from "@/hooks/useSidebarProfile";
import { studyRoomsApi, teacherApi } from "@/lib/api";

const SUBJECT_AR = {
  math: "رياضيات", physics: "فيزياء", chemistry: "كيمياء",
  biology: "أحياء", arabic: "عربي", english: "إنجليزي",
  history: "تاريخ", geography: "جغرافيا", general: "عام"
};

const GRADE_AR = {
  first: "أول ثانوي", second: "تاني ثانوي", third: "تالت ثانوي",
  sec_first: "أول ثانوي", sec_second: "تاني ثانوي", sec_third: "تالت ثانوي",
  prep_first: "أول إعدادي", prep_second: "تاني إعدادي", prep_third: "تالت إعدادي"
};

export default function TeacherStudyRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await teacherApi.studyRooms();
      if (!json.success) throw new Error(json.error || "تعذر تحميل الغرف");

      setRooms(json.data?.rooms || []);
      setSubjects(json.data?.subjects || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل غرفك");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const reload = () => load();
    window.addEventListener(PROFILE_UPDATED, reload);
    return () => window.removeEventListener(PROFILE_UPDATED, reload);
  }, [load]);

  const handleJoin = async (roomId) => {
    setJoiningId(roomId);
    try {
      const json = await studyRoomsApi.join(roomId);
      if (!json.success) throw new Error(json.error);

      router.push(`/teacher/study-rooms/${roomId}?channel=qa`);
    } catch (err) {
      setError(err.message || "تعذر الدخول للغرفة");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <SectionLoader message="جاري تحميل غرف مادتك…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminPageHeader
        eyebrow="غرف المذاكرة"
        title="غرف مادتك"
        subtitle={
          subjects.length
            ? `مواد: ${subjects.map((s) => SUBJECT_AR[s] || s).join("، ")}`
            : "ابدأ بتحديد مادتك في ملفك الشخصي"
        }
        actions={[
          { label: "تحديث", icon: "refresh", variant: "secondary", onClick: load }
        ]}
      />

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 border border-danger/30 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {!subjects.length ? (
        <div className={cn(teacherCardSolid, "p-8 text-center")}>
          <p className="text-lg font-black text-auth-on-surface mb-2">حدد مادتك أولاً</p>
          <p className={cn("text-sm mb-4", teacherMuted)}>
            روح ملفك الشخصي وحدد المواد اللي بتدرسها عشان تشوف الغرف
          </p>
          <button
            type="button"
            className={teacherBtnPrimary}
            onClick={() => router.push("/teacher/profile")}
          >
            تحديث الملف الشخصي
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className={cn(teacherCardSolid, "p-8 text-center")}>
          <p className="text-lg font-black text-auth-on-surface mb-2">مفيش غرف نشطة دلوقتي</p>
          <p className={cn("text-sm", teacherMuted)}>
            لما طلابك يبدأوا غرف مذاكرة في مادتك هتظهر هنا
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className={cn(teacherCardSolid, "p-5 flex flex-col gap-4")}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-auth-on-surface text-base">
                    {SUBJECT_AR[room.subject] || room.subject_label || room.subject}
                  </h3>
                  <p className={cn("text-sm mt-0.5", teacherMuted)}>
                    {GRADE_AR[room.grade] || room.grade_label || room.grade}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold",
                  room.status === "active"
                    ? "bg-success/20 text-success"
                    : "bg-auth-surface-variant/40 text-auth-on-surface-variant"
                )}>
                  {room.status === "active" ? "نشطة" : "مفتوحة"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={cn("text-sm", teacherMuted)}>
                  {room.member_count} طالب داخل الغرفة
                </span>
                <button
                  type="button"
                  onClick={() => handleJoin(room.id)}
                  disabled={joiningId === room.id}
                  className={cn(teacherBtnPrimary, "text-xs py-1.5 px-3")}
                >
                  {joiningId === room.id ? "جاري الدخول…" : "دخول ورد على الأسئلة"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
