"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ParentDashboardView from "@/components/parent/ParentDashboardPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { parentApi } from "@/lib/api";
import { patchParentDashboardUrl, resolveSelectedChildId } from "@/lib/parent-dashboard";

function ParentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlStudent = useMemo(() => searchParams.get("student") || "", [searchParams]);

  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState(null);
  const [parentName, setParentName] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  const replaceUrl = useCallback(
    (patch) => {
      router.replace(patchParentDashboardUrl(searchParams, patch), { scroll: false });
    },
    [router, searchParams]
  );

  const loadDashboard = useCallback(
    async ({ studentId, silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const res = await parentApi.dashboard(studentId || undefined);
        const payload = res?.data || {};
        const list = payload.children || [];

        setChildren(list);
        setParentName(payload.parent_name || "");
        setReport(payload.report || null);

        const nextId = resolveSelectedChildId({
          children: list,
          urlStudent: studentId || urlStudent,
          apiSelectedId: payload.selected_student_id
        });

        setSelectedId(nextId);
        return nextId;
      } catch (err) {
        if (!silent) {
          setChildren([]);
          setReport(null);
          setSelectedId("");
        }
        setError(err.message || "تعذر تحميل لوحة ولي الأمر");
        return "";
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [urlStudent]
  );

  useEffect(() => {
    let active = true;

    async function run() {
      const nextId = await loadDashboard({ studentId: urlStudent || undefined });
      if (!active || !nextId || urlStudent) return;
      replaceUrl({ student: nextId });
    }

    run();
    return () => {
      active = false;
    };
  }, [urlStudent, loadDashboard, replaceUrl]);

  const handleSelectChild = (id) => {
    replaceUrl({ student: id });
  };

  const handleLink = async (event) => {
    event.preventDefault();
    const code = linkCode.trim().toUpperCase();
    if (!code) {
      toast.error("أدخل كود الربط");
      return;
    }

    setLinking(true);
    try {
      const res = await parentApi.linkStudent(code);
      toast.success(res?.message || "تم ربط الطالب بنجاح");
      setLinkCode("");
      setShowLinkForm(false);
      const studentId = res?.data?.student_id;
      if (studentId) replaceUrl({ student: studentId });
      else await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err.message || "تعذر ربط الطالب");
    } finally {
      setLinking(false);
    }
  };

  return (
    <ParentDashboardView
      parentName={parentName}
      linkedChildren={children}
      selectedId={selectedId}
      onSelectChild={handleSelectChild}
      report={report}
      showLinkForm={showLinkForm}
      onToggleLinkForm={() => setShowLinkForm((value) => !value)}
      linkCode={linkCode}
      onLinkCodeChange={setLinkCode}
      onLinkSubmit={handleLink}
      linking={linking}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadDashboard({ studentId: selectedId || urlStudent || undefined, silent: true })}
    />
  );
}

export default function ParentDashboardRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل لوحة ولي الأمر..." />
        </div>
      }
    >
      <ParentDashboardContent />
    </Suspense>
  );
}
