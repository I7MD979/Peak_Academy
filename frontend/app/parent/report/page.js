"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import ProgressBar from "@/components/shared/ProgressBar";
import EmptyState from "@/components/shared/EmptyState";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { parentApi } from "@/lib/api";
import { formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

const SESSION_STATUS = {
  scheduled: "قادمة",
  live: "مباشرة",
  completed: "منتهية",
  cancelled: "ملغاة"
};

function StudentAvatar({ name, avatarUrl }) {
  const initial = (name || "ط").trim().slice(0, 1);
  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-accent/10 text-lg font-black text-accent">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name || ""} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

export default function ParentReportPage() {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [linkCode, setLinkCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await parentApi.children();
      const list = res?.data?.children || [];
      setChildren(list);
      const urlStudent =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("student")
          : null;
      setSelectedId((current) => {
        if (urlStudent && list.some((c) => c.id === urlStudent)) return urlStudent;
        if (current && list.some((c) => c.id === current)) return current;
        return list[0]?.id || null;
      });
    } catch (err) {
      setChildren([]);
      setError(err.message || "تعذر تحميل الأبناء المربوطين");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (studentId) => {
    if (!studentId) {
      setReport(null);
      return;
    }
    setReportLoading(true);
    try {
      const res = await parentApi.report(studentId);
      setReport(res?.data || null);
    } catch (err) {
      setReport(null);
      toast.error(err.message || "تعذر تحميل التقرير");
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedId) loadReport(selectedId);
  }, [selectedId, loadReport]);

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
      toast.success(res?.message || "تم ربط الطالب");
      setLinkCode("");
      await loadChildren();
    } catch (err) {
      toast.error(err.message || "تعذر ربط الطالب");
    } finally {
      setLinking(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedId) return;
    setDownloading(true);
    try {
      const blob = await parentApi.downloadReport(selectedId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `peak-report-${report?.student?.full_name || "student"}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل التقرير");
    } catch (err) {
      toast.error(err.message || "تعذر تنزيل التقرير");
    } finally {
      setDownloading(false);
    }
  };

  const stats = report?.stats;
  const student = report?.student;

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">متابعة الأداء</p>
            <h1 className="mt-1 text-2xl font-black">تقرير الطالب</h1>
            <p className="mt-2 text-sm text-white/75">
              تقرير أسبوعي مبسّط عن الجلسات والمواد والأسئلة — مبني على بيانات حقيقية من المنصة.
            </p>
          </div>
          <Button
            href="/parent/dashboard"
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            الرئيسية
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={loadChildren}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <section className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-black text-text">ربط ابن/ابنة</h2>
          <p className="mt-1 text-sm text-text-muted">
            اطلب من ابنك كود الربط من صفحة «حسابي» في تطبيق الطالب.
          </p>
        </div>
        <form onSubmit={handleLink} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
            placeholder="كود الربط"
            dir="ltr"
            className="font-mono uppercase"
            maxLength={12}
          />
          <Button type="submit" variant="accent" className="rounded-xl shrink-0" disabled={linking}>
            {linking ? "جارٍ الربط..." : "ربط الطالب"}
          </Button>
        </form>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionLoader />
        </div>
      ) : null}

      {!loading && children.length === 0 ? (
        <EmptyState
          title="لا يوجد طالب مربوط بعد"
          description="أدخل كود الربط أعلاه لمتابعة تقرير ابنك."
        />
      ) : null}

      {!loading && children.length > 0 ? (
        <>
          <section className="flex flex-wrap gap-2">
            {children.map((child) => {
              const active = selectedId === child.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedId(child.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-card text-text hover:border-accent/40"
                  )}
                >
                  <span>
                    {child.full_name}
                    {child.grade_label ? ` · ${child.grade_label}` : ""}
                  </span>
                </button>
              );
            })}
          </section>

          {reportLoading ? (
            <SectionLoader />
          ) : report && student ? (
            <>
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} />
                  <div>
                    <h2 className="text-lg font-black text-text">{student.full_name}</h2>
                    <p className="text-sm text-text-muted">
                      {student.grade_label || "—"}
                      {student.section ? ` · شعبة ${student.section}` : ""}
                      {" · "}
                      ستريك {student.streak_days?.toLocaleString("ar-EG") || 0} يوم
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatsCard
                  title="جلسات هذا الشهر"
                  value={(stats?.sessions_this_month ?? 0).toLocaleString("ar-EG")}
                  iconName="calendarDays"
                  tone="blue"
                  hint="تسجيلات آخر 30 يوماً"
                />
                <StatsCard
                  title="متوسط التقدم"
                  value={`${(stats?.average_progress ?? 0).toLocaleString("ar-EG")}%`}
                  iconName="trending"
                  tone="accent"
                  hint="عبر المواد الدراسية"
                />
                <StatsCard
                  title="ساعات المذاكرة"
                  value={(stats?.study_hours ?? 0).toLocaleString("ar-EG")}
                  iconName="book"
                  tone="success"
                  hint="تقديرية من الجلسات المكتملة"
                />
                <StatsCard
                  title="الأسئلة"
                  value={`${(stats?.questions_answered ?? 0).toLocaleString("ar-EG")}/${(stats?.questions_total ?? 0).toLocaleString("ar-EG")}`}
                  iconName="help"
                  tone="warning"
                  hint="تم الرد / الإجمالي"
                />
              </section>

              {report.alerts?.length > 0 ? (
                <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
                  <p className="font-bold text-warning">تنبيهات تحتاج متابعة</p>
                  <ul className="mt-2 space-y-1 text-sm text-text">
                    {report.alerts.map((alert, index) => (
                      <li key={index}>• {alert.message}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="glass-card space-y-4 p-5">
                <h2 className="text-lg font-black text-text">الأداء حسب المادة</h2>
                {report.subjects?.length > 0 ? (
                  <div className="space-y-4">
                    {report.subjects.map((subject) => (
                      <div key={subject.key}>
                        <ProgressBar label={subject.label} value={subject.progress} />
                        <p className="mt-1 text-xs text-text-muted">
                          {subject.completed.toLocaleString("ar-EG")} جلسة مكتملة من{" "}
                          {subject.total.toLocaleString("ar-EG")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">لا توجد جلسات مسجّلة بعد لحساب هذا الطالب.</p>
                )}
              </section>

              {report.recent_sessions?.length > 0 ? (
                <section className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-lg font-black text-text">آخر الجلسات</h2>
                  <ul className="mt-3 divide-y divide-border">
                    {report.recent_sessions.map((session) => (
                      <li
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <p className="font-bold text-text">{session.subject_label}</p>
                          <p className="text-xs text-text-muted">
                            {formatDateTimeAr(session.scheduled_at)}
                          </p>
                        </div>
                        <StatusBadge
                          status={
                            session.status === "completed"
                              ? "completed"
                              : session.status === "live"
                                ? "live"
                                : "scheduled"
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="accent"
                  className="rounded-xl"
                  disabled={downloading}
                  onClick={handleDownload}
                >
                  <Icon name="book" size={18} />
                  {downloading ? "جارٍ التنزيل..." : "تنزيل التقرير"}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => loadReport(selectedId)}>
                  تحديث التقرير
                </Button>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
