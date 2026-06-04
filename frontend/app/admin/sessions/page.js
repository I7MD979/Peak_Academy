"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import SessionDetailsModal from "@/components/admin/SessionDetailsModal";
import { sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusTabs = [
  { key: "all", label: "الكل" },
  { key: "scheduled", label: "قادمة" },
  { key: "live", label: "مباشرة الآن" },
  { key: "completed", label: "منتهية" },
  { key: "cancelled", label: "ملغاة" }
];

function getEnrollmentCount(session) {
  return session?.enrollments?.[0]?.count ?? 0;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter
      });
      if (search) params.set("search", search);

      const payload = await sessionsApi.list(params.toString());
      setSessions(payload?.data || []);
      setTotalPages(payload?.pagination?.totalPages || 1);
      setTotalSessions(payload?.pagination?.total || 0);
    } catch (err) {
      setSessions([]);
      setTotalPages(1);
      setTotalSessions(0);
      setError(err.message || "تعذر تحميل الجلسات");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCancel = async (session) => {
    if (session.status === "completed" || session.status === "cancelled") return;

    const confirmed = window.confirm(`هل تريد إلغاء الجلسة "${session.title}"؟`);
    if (!confirmed) return;

    setMutatingId(session.id);
    try {
      await sessionsApi.cancel(session.id);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: "cancelled" } : s)));
      toast.success("تم إلغاء الجلسة بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل إلغاء الجلسة");
    } finally {
      setMutatingId("");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "العنوان",
        render: (row) => (
          <div className="min-w-[180px]">
            <p className="font-bold text-text">{row.title}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {row.subject?.icon ? `${row.subject.icon} ` : ""}
              {row.subject?.name_ar || row.subject || "مادة عامة"}
            </p>
          </div>
        )
      },
      {
        key: "teacher",
        label: "المدرس",
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
              {(row.teacher?.full_name || "?").slice(0, 1)}
            </div>
            <span>{row.teacher?.full_name || "—"}</span>
          </div>
        )
      },
      {
        key: "scheduled_at",
        label: "الموعد",
        render: (row) => formatDateTimeAr(row.scheduled_at)
      },
      {
        key: "students",
        label: "الطلاب",
        render: (row) => {
          const enrolled = getEnrollmentCount(row);
          const max = row.max_students || 0;
          const full = max > 0 && enrolled >= max;
          return <span className={cn("font-bold", full ? "text-danger" : "text-text")}>{enrolled}/{max || "—"}</span>;
        }
      },
      {
        key: "price",
        label: "السعر",
        render: (row) => <span className="font-bold text-accent">{formatCurrencyEgp(row.price_per_student)}</span>
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status} />
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => {
          const busy = mutatingId === row.id;
          const canCancel = row.status === "scheduled" || row.status === "live";

          return (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setSelectedSession(row)}
              >
                عرض التفاصيل
              </Button>

              {canCancel ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={() => handleCancel(row)}
                >
                  {busy ? "جاري..." : "إلغاء الجلسة"}
                </Button>
              ) : null}
            </div>
          );
        }
      }
    ],
    [mutatingId]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-l from-primary to-[#0f1117] p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">إدارة الجلسات</p>
        <h1 className="mt-1 text-2xl font-black">متابعة كل الجلسات على المنصة</h1>
        <p className="mt-2 text-sm text-white/75">
          راقب الجلسات القادمة والمباشرة والمنتهية، ونفّذ إجراءات الإدارة بسرعة وبوضوح.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setPage(1);
                setStatusFilter(tab.key);
              }}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                statusFilter === tab.key
                  ? "bg-accent text-white"
                  : "border border-border bg-bg text-text-muted hover:text-text"
              )}
            >
              {tab.label}
              {tab.key === "live" ? <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-success align-middle" /> : null}
            </button>
          ))}
        </div>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث بعنوان الجلسة..."
          className="h-11 w-full rounded-xl border border-border px-4 text-sm font-cairo focus:border-accent focus:outline-none"
        />
      </section>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3">
          <p className="text-sm font-bold text-danger">⚠️ {error}</p>
          <Button type="button" onClick={loadSessions} className="mt-3 rounded-xl bg-danger text-white hover:bg-red-500">
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        emptyMessage="لا توجد جلسات مطابقة"
        emptyDescription="جرّب تغيير الفلاتر أو البحث لعرض نتائج أخرى."
        getRowClassName={(row) =>
          row.status === "live" ? "border-r-4 border-r-success bg-success/5" : ""
        }
      />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="text-text-muted">
          إجمالي الجلسات: <span className="font-bold text-text">{totalSessions}</span>
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            السابق
          </Button>
          <span className="min-w-24 text-center font-semibold text-text-muted">
            صفحة {page} من {Math.max(1, totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
            disabled={page >= totalPages || loading}
          >
            التالي
          </Button>
        </div>
      </section>

      <SessionDetailsModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    </div>
  );
}
