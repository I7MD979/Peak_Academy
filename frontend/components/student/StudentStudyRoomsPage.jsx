"use client";

import Link from "next/link";
import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatsCard from "@/components/admin/StatsCard";
import StudyRoomCard from "@/components/student/StudyRoomCard";
import EmptyState from "@/components/shared/EmptyState";
import { SectionLoader, StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { Select } from "@/components/ui/Select";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentErrorBox,
  studentMuted
} from "@/lib/student-styles";
import { formatDateAr } from "@/lib/format";
import { cn } from "@/lib/utils";

function ActiveRoomPanel({ room, leaving, onLeave }) {
  if (!room) return null;

  return (
    <section className="rounded-2xl border border-success/40 bg-success/10 p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <span className="text-xs font-bold text-success">أنت داخل غرفة الآن</span>
          </div>
          <h2 className="text-xl font-black text-auth-on-surface">{room.subject_label}</h2>
          <p className={cn("mt-1 text-sm", studentMuted)}>
            {room.grade_label} — {room.status_label}
          </p>
          <p className="mt-2 text-sm text-auth-on-surface-variant">
            {(room.member_count ?? 0).toLocaleString("ar-EG")} طالب في الغرفة
            {room.joined_at ? ` · انضممت ${formatDateAr(room.joined_at)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          disabled={leaving}
          className={cn(studentBtnSecondary, "border-danger/40 text-danger hover:bg-danger/10")}
        >
          {leaving ? "جاري المغادرة…" : "مغادرة الغرفة"}
        </button>
      </div>

      {room.members?.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {room.members.map((member) => (
            <li
              key={member.user_id}
              className="inline-flex items-center gap-2 rounded-full border border-auth-outline-variant/30 bg-auth-surface-low px-3 py-1 text-xs font-bold text-auth-on-surface"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-peak-orange/15 text-peak-orange">
                {(member.full_name || "ط").slice(0, 1)}
              </span>
              {member.full_name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function StudentStudyRoomsPage({
  gradeLabel = "",
  stats = {},
  activeRoom = null,
  openRooms = [],
  subjects = [],
  subjectFilter = "",
  onSubjectFilterChange,
  selectedSubject = "",
  onSelectedSubjectChange,
  subjectOptions = [],
  onJoinRandom,
  onJoinRoom,
  onLeave,
  joiningId = null,
  leaving = false,
  loading = false,
  refreshing = false,
  error = "",
  profileIncomplete = false,
  onRefresh
}) {
  const filterTabs = [
    { key: "", label: "كل المواد" },
    ...subjects.map((s) => ({ key: s.key, label: s.label }))
  ];

  if (loading && !gradeLabel && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل غرف المذاكرة..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="غرف المذاكرة"
        title="ذاكر مع زملائك"
        subtitle={
          gradeLabel
            ? `غرف مخصصة لـ ${gradeLabel} — انضم لغرفة أو ابدأ جلسة مذاكرة جماعية`
            : "أكمل صفك الدراسي للانضمام لغرف المذاكرة"
        }
        actions={[
          {
            label: refreshing || loading ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "لوحتي",
            icon: "dashboard",
            variant: "secondary",
            href: "/student/dashboard"
          }
        ]}
      />

      {profileIncomplete ? (
        <section className={cn(studentCardSolid, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <p className="font-black text-auth-on-surface">أكمل ملفك الدراسي</p>
            <p className={cn("mt-1 text-sm", studentMuted)}>حدّد صفك الدراسي لتتمكن من الانضمام لغرف المذاكرة.</p>
          </div>
          <Link href="/student/profile" className={studentBtnPrimary}>
            إكمال الملف
          </Link>
        </section>
      ) : null}

      {error ? (
        <div className={studentErrorBox}>
          <p>{error}</p>
          {onRefresh ? (
            <button type="button" className="mt-2 text-sm font-bold text-peak-orange underline" onClick={onRefresh}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      {!profileIncomplete && !error ? (
        <>
          <ActiveRoomPanel room={activeRoom} leaving={leaving} onLeave={onLeave} />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatsCard
                  variant="dark"
                  title="غرف متاحة"
                  value={(stats.open_rooms_count ?? openRooms.length).toLocaleString("ar-EG")}
                  iconName="school"
                  tone="blue"
                />
                <StatsCard
                  variant="dark"
                  title="حالتك"
                  value={stats.in_room ? "داخل غرفة" : "غير منضم"}
                  iconName={stats.in_room ? "live" : "user"}
                  tone={stats.in_room ? "success" : "warning"}
                />
                <StatsCard
                  variant="dark"
                  title="أعضاء غرفتك"
                  value={(stats.active_members ?? activeRoom?.member_count ?? 0).toLocaleString("ar-EG")}
                  iconName="users"
                  tone="accent"
                  hint={gradeLabel || undefined}
                />
              </>
            )}
          </section>

          <section className={cn(studentCardSolid, "space-y-4 p-5 md:p-6")}>
            <div>
              <h2 className="text-lg font-black text-auth-on-surface">انضمام سريع</h2>
              <p className={cn("mt-1 text-sm", studentMuted)}>
                اختر المادة وسنضمّك لغرفة متاحة لصفك أو ننشئ غرفة جديدة.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <Select
                variant="dark"
                label="المادة"
                value={selectedSubject}
                onChange={(e) => onSelectedSubjectChange?.(e.target.value)}
                options={subjectOptions}
                disabled={loading || Boolean(activeRoom) || joiningId === "random"}
                aria-label="اختر المادة للانضمام السريع"
              />
              <button
                type="button"
                onClick={onJoinRandom}
                disabled={!selectedSubject || loading || Boolean(activeRoom) || joiningId === "random"}
                className={cn(studentBtnPrimary, "h-11 px-8")}
              >
                {joiningId === "random" ? (
                  <>
                    <Icon name="refresh" size={18} className="animate-spin" />
                    جاري الانضمام…
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={18} />
                    انضم الآن
                  </>
                )}
              </button>
            </div>
            {activeRoom ? (
              <p className="text-xs text-auth-on-surface-variant">غادر غرفتك الحالية قبل الانضمام لغرفة أخرى.</p>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black text-auth-on-surface">الغرف المفتوحة</h2>
            </div>

            <AdminFilterTabs
              tabs={filterTabs}
              value={subjectFilter}
              onChange={onSubjectFilterChange}
              className="max-w-full overflow-x-auto"
            />

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-auth-surface-low" />
                ))}
              </div>
            ) : openRooms.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {openRooms.map((room) => (
                  <StudyRoomCard
                    key={room.id}
                    room={room}
                    onJoin={onJoinRoom}
                    joiningId={joiningId}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد غرف مفتوحة حالياً"
                hint={
                  subjectFilter
                    ? "جرّب مادة أخرى أو انضم عبر «انضمام سريع» لإنشاء غرفة."
                    : "كن أول من ينضم عبر «انضمام سريع» لبدء غرفة جديدة."
                }
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
