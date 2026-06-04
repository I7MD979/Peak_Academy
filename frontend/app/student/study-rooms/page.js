"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/StatsCard";
import StudyRoomCard from "@/components/student/StudyRoomCard";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { studyRoomsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function StudentStudyRoomsPage() {
  const [data, setData] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await studyRoomsApi.overview();
      const payload = res?.data || null;
      setData(payload);
      if (payload?.subjects?.length) {
        setSelectedSubject((current) =>
          payload.subjects.some((s) => s.key === current) ? current : payload.subjects[0].key
        );
      }
    } catch (err) {
      setData(null);
      setError(err.message || "تعذر تحميل غرف المذاكرة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleJoinRandom = async () => {
    if (!selectedSubject) {
      toast.error("اختر المادة أولاً");
      return;
    }
    setJoiningId("random");
    try {
      const res = await studyRoomsApi.joinRandom({ subject: selectedSubject });
      toast.success(res?.message || "تم الانضمام للغرفة");
      await loadOverview();
    } catch (err) {
      toast.error(err.message || "تعذر الانضمام");
    } finally {
      setJoiningId(null);
    }
  };

  const handleJoinRoom = async (room) => {
    if (!room?.id) return;
    setJoiningId(room.id);
    try {
      const res = await studyRoomsApi.join(room.id);
      toast.success(res?.message || "تم الانضمام للغرفة");
      await loadOverview();
    } catch (err) {
      toast.error(err.message || "تعذر الانضمام");
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async () => {
    const roomId = data?.active_room?.id;
    if (!roomId) return;
    setLeaving(true);
    try {
      const res = await studyRoomsApi.leave(roomId);
      toast.success(res?.message || "تم مغادرة الغرفة");
      await loadOverview();
    } catch (err) {
      toast.error(err.message || "تعذر مغادرة الغرفة");
    } finally {
      setLeaving(false);
    }
  };

  const activeRoom = data?.active_room;
  const openRooms = data?.open_rooms || [];
  const subjects = data?.subjects || [];
  const stats = data?.stats || {};

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">التعلم الجماعي</p>
            <h1 className="mt-1 text-2xl font-black">غرف المذاكرة</h1>
            <p className="mt-2 text-sm text-white/75">
              {data?.grade_label
                ? `صفك: ${data.grade_label} — انضم لزملائك في غرفة مذاكرة حسب المادة.`
                : "ذاكر مع زملائك في نفس الصف والمادة."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={loadOverview}
            disabled={loading}
          >
            تحديث
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          {error.includes("الصف") ? (
            <Link href="/student/profile" className="mt-2 inline-block text-sm font-bold text-accent">
              إكمال الملف الشخصي
            </Link>
          ) : (
            <Button type="button" className="mt-3" variant="outline" onClick={loadOverview}>
              إعادة المحاولة
            </Button>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <LoadingSkeleton />
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <StatsCard
              title="غرف متاحة لصفك"
              value={(stats.open_rooms_count ?? 0).toLocaleString("ar-EG")}
              iconName="school"
              tone="blue"
              hint="غرف مفتوحة يمكنك الانضمام لها"
            />
            <StatsCard
              title="حالتك الآن"
              value={stats.in_room ? "داخل غرفة" : "غير منضم"}
              iconName="users"
              tone={stats.in_room ? "success" : "accent"}
              hint={stats.in_room ? "يمكنك المغادرة أو متابعة الزملاء" : "انضم لغرفة جديدة"}
            />
          </section>

          {activeRoom ? (
            <section className="rounded-2xl border border-success/30 bg-success/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-success">غرفتك النشطة</p>
                  <h2 className="mt-1 text-xl font-black text-text">
                    {activeRoom.subject_label} — {activeRoom.grade_label}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {activeRoom.member_count?.toLocaleString("ar-EG")} من{" "}
                    {activeRoom.capacity?.toLocaleString("ar-EG")} طلاب · {activeRoom.status_label}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-danger/30 text-danger hover:bg-danger/10"
                  disabled={leaving}
                  onClick={handleLeave}
                >
                  {leaving ? "جارٍ المغادرة..." : "مغادرة الغرفة"}
                </Button>
              </div>

              {activeRoom.members?.length ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {activeRoom.members.map((member) => (
                    <li
                      key={member.user_id}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-text"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-black text-accent">
                        {member.full_name?.charAt(0) || "ط"}
                      </span>
                      {member.full_name}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 rounded-xl border border-dashed border-success/40 bg-card/80 p-4 text-sm text-text-muted">
                <Icon name="users" size={18} className="mb-2 text-success" />
                <p className="font-semibold text-text">غرفة المذاكرة الجماعية</p>
                <p className="mt-1">
                  أنت منضم للغرفة. نسّق مع زملائك في المذاكرة — ميزات الدردشة والصوت قادمة قريباً.
                </p>
              </div>
            </section>
          ) : (
            <section className="glass-card space-y-4 p-5">
              <div>
                <h2 className="text-lg font-black text-text">انضمام سريع</h2>
                <p className="mt-1 text-sm text-text-muted">
                  نضمّك تلقائياً لأقرب غرفة مفتوحة في نفس المادة والصف، أو ننشئ غرفة جديدة.
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-text">اختر المادة</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => {
                    const active = selectedSubject === subject.key;
                    return (
                      <button
                        key={subject.key}
                        type="button"
                        onClick={() => setSelectedSubject(subject.key)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
                          active
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-card text-text hover:border-accent/40"
                        )}
                      >
                        {subject.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                variant="accent"
                disabled={joiningId === "random"}
                onClick={handleJoinRandom}
              >
                {joiningId === "random" ? "جارٍ البحث عن غرفة..." : "انضم لغرفة عشوائية"}
              </Button>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-text">غرف مفتوحة في صفك</h2>
              <span className="text-xs font-bold text-text-muted">
                {openRooms.length.toLocaleString("ar-EG")} غرفة
              </span>
            </div>

            {openRooms.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {openRooms.map((room) => (
                  <StudyRoomCard
                    key={room.id}
                    room={room}
                    joiningId={joiningId}
                    onJoin={handleJoinRoom}
                    compact={Boolean(activeRoom)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد غرف مفتوحة حالياً"
                description="كن أول من ينشئ غرفة عبر الانضمام السريع أعلاه."
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
