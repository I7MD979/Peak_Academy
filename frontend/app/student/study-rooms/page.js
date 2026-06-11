"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import StudentStudyRoomsView from "@/components/student/StudentStudyRoomsPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { studentApi, logApiError } from "@/lib/api";

function StudentStudyRoomsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const subjectFilter = useMemo(() => searchParams.get("subject") || "", [searchParams]);

  const [data, setData] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const replaceSubjectInUrl = useCallback(
    (subject) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!subject) params.delete("subject");
      else params.set("subject", subject);
      const qs = params.toString();
      router.replace(qs ? `/student/study-rooms?${qs}` : "/student/study-rooms", { scroll: false });
    },
    [router, searchParams]
  );

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      setProfileIncomplete(false);

      try {
        const query = subjectFilter ? `subject=${encodeURIComponent(subjectFilter)}` : "";
        const res = await studentApi.studyRooms(query);
        const payload = res?.data || null;
        setData(payload);

        if (payload?.subjects?.length) {
          setSelectedSubject((current) => {
            if (payload.subjects.some((s) => s.key === current)) return current;
            if (subjectFilter && payload.subjects.some((s) => s.key === subjectFilter)) {
              return subjectFilter;
            }
            return payload.subjects[0].key;
          });
        }
      } catch (err) {
        const noAccess =
          err?.status === 403 ||
          err?.code === "NO_ROOM_ACCESS" ||
          /اشتراك|تجربة|الوصول/.test(String(err?.message || ""));
        if (noAccess) {
          router.replace(
            "/student/subscription?reason=study_rooms&redirect=/student/study-rooms"
          );
          return;
        }
        logApiError("student/study-rooms", err);
        const message = err.message || "تعذر تحميل غرف المذاكرة";
        if (message.includes("ملفك الدراسي") || message.includes("الصف")) {
          setProfileIncomplete(true);
          setError("");
        } else {
          setError(message);
        }
        if (!silent) setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, subjectFilter]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const subjectOptions = useMemo(
    () => (data?.subjects || []).map((s) => ({ value: s.key, label: s.label })),
    [data?.subjects]
  );

  const handleJoinRandom = async () => {
    if (!selectedSubject) {
      toast.error("اختر المادة أولاً");
      return;
    }
    setJoiningId("random");
    try {
      const res = await studentApi.joinRandomStudyRoom({ subject: selectedSubject });
      toast.success(res?.message || "تم الانضمام للغرفة");
      await loadOverview({ silent: true });
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
      const res = await studentApi.joinStudyRoom(room.id);
      toast.success(res?.message || "تم الانضمام للغرفة");
      await loadOverview({ silent: true });
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
      const res = await studentApi.leaveStudyRoom(roomId);
      toast.success(res?.message || "تم مغادرة الغرفة");
      await loadOverview({ silent: true });
    } catch (err) {
      toast.error(err.message || "تعذر مغادرة الغرفة");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <StudentStudyRoomsView
      gradeLabel={data?.grade_label || ""}
      stats={data?.stats || {}}
      activeRoom={data?.active_room || null}
      openRooms={data?.open_rooms || []}
      subjects={data?.subjects || []}
      subjectFilter={subjectFilter}
      onSubjectFilterChange={replaceSubjectInUrl}
      selectedSubject={selectedSubject}
      onSelectedSubjectChange={setSelectedSubject}
      subjectOptions={subjectOptions}
      onJoinRandom={handleJoinRandom}
      onJoinRoom={handleJoinRoom}
      onLeave={handleLeave}
      joiningId={joiningId}
      leaving={leaving}
      loading={loading}
      refreshing={refreshing}
      error={error}
      profileIncomplete={profileIncomplete}
      onRefresh={() => loadOverview({ silent: true })}
    />
  );
}

export default function StudentStudyRoomsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل غرف المذاكرة..." />
        </div>
      }
    >
      <StudentStudyRoomsContent />
    </Suspense>
  );
}
