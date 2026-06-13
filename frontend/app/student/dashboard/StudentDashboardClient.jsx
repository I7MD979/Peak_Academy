"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import StudentDashboardView from "@/components/student/StudentDashboardPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { studentApi, logApiError } from "@/lib/api";
import { mapSessionForCard } from "@/lib/session-mapper";

const SECTION_KEYS = new Set(["all", "live", "upcoming", "recommended"]);

function StudentDashboardContent({ initialData = null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const section = useMemo(() => {
    const raw = searchParams.get("section") || "all";
    return SECTION_KEYS.has(raw) ? raw : "all";
  }, [searchParams]);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else if (!data) setLoading(true);
    setError("");
    try {
      const res = await studentApi.dashboard();
      setData(res?.data || null);
    } catch (err) {
      logApiError("student/dashboard", err);
      if (!silent) setData(null);
      setError(err.message || "تعذر تحميل الصفحة الرئيسية");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    if (initialData) return;
    loadDashboard();
  }, [initialData, loadDashboard]);

  const onSectionChange = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === "all") params.delete("section");
    else params.set("section", next);
    const qs = params.toString();
    router.replace(qs ? `/student/dashboard?${qs}` : "/student/dashboard", { scroll: false });
  };

  const copyLinkCode = async () => {
    const code = data?.profile?.link_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("تم نسخ كود الربط");
    } catch {
      toast.error("تعذر النسخ — انسخ الكود يدوياً");
    }
  };

  const liveSessions = (data?.live_sessions || []).map((s) => mapSessionForCard(s, { isEnrolled: true }));
  const upcomingSessions = (data?.upcoming_sessions || []).map((s) => mapSessionForCard(s, { isEnrolled: true }));
  const recommendedSessions = (data?.recommended_sessions || []).map((s) =>
    mapSessionForCard(s, { isEnrolled: false })
  );

  return (
    <StudentDashboardView
      profile={data?.profile}
      stats={data?.stats}
      liveSessions={liveSessions}
      upcomingSessions={upcomingSessions}
      recommendedSessions={recommendedSessions}
      section={section}
      onSectionChange={onSectionChange}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadDashboard({ silent: true })}
      onCopyLinkCode={copyLinkCode}
    />
  );
}

export default function StudentDashboardClient({ initialData = null }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل لوحة الطالب..." />
        </div>
      }
    >
      <StudentDashboardContent initialData={initialData} />
    </Suspense>
  );
}
