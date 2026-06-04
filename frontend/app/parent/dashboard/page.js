"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import ParentChildCard from "@/components/parent/ParentChildCard";
import ProgressBar from "@/components/shared/ProgressBar";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { parentApi } from "@/lib/api";
import { formatDateTimeAr } from "@/lib/format";

export default function ParentDashboardPage() {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [parentName, setParentName] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (studentId) => {
    setLoading(true);
    setError("");
    try {
      const res = await parentApi.dashboard(studentId || undefined);
      const payload = res?.data || {};
      const list = payload.children || [];

      setChildren(list);
      setParentName(payload.parent_name || "");
      setReport(payload.report || null);

      const urlStudent =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("student")
          : null;

      const nextId =
        (studentId && list.some((c) => c.id === studentId) ? studentId : null) ||
        (urlStudent && list.some((c) => c.id === urlStudent) ? urlStudent : null) ||
        payload.selected_student_id ||
        list[0]?.id ||
        null;

      setSelectedId(nextId);
    } catch (err) {
      setChildren([]);
      setReport(null);
      setError(err.message || "تعذر تحميل لوحة ولي الأمر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSelectChild = (id) => {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("student", id);
      window.history.replaceState({}, "", url.toString());
    }
    loadDashboard(id);
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
      await loadDashboard(res?.data?.student_id);
    } catch (err) {
      toast.error(err.message || "تعذر ربط الطالب");
    } finally {
      setLinking(false);
    }
  };

  const student = report?.student;
  const stats = report?.stats;
  const firstName = parentName?.split(" ")?.[0] || "ولي الأمر";

  const reportHref = selectedId
    ? `/parent/report?student=${encodeURIComponent(selectedId)}`
    : "/parent/report";

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">لوحة ولي الأمر</p>
            <h1 className="mt-1 text-2xl font-black">أهلاً {firstName}</h1>
            <p className="mt-2 text-sm text-white/75">
              تابع تقدم أبنائك في الجلسات والمواد والأسئلة — كل شيء في مكان واحد.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => loadDashboard(selectedId)}
            disabled={loading}
          >
            تحديث
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button
            type="button"
            className="mt-3"
            variant="outline"
            onClick={() => loadDashboard(selectedId)}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <section className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="users" size={20} className="text-accent" />
            <div>
              <h2 className="text-sm font-bold text-text">الأبناء المربوطون</h2>
              <p className="text-xs text-text-muted">
                {children.length.toLocaleString("ar-EG")} طالب مربوط
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setShowLinkForm((v) => !v)}
          >
            {showLinkForm ? "إخفاء" : "+ ربط طالب"}
          </Button>
        </div>

        {showLinkForm ? (
          <form onSubmit={handleLink} className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <Input
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              placeholder="كود الربط من صفحة «حسابي» للطالب"
              dir="ltr"
              className="font-mono uppercase"
              maxLength={12}
              aria-label="كود الربط"
            />
            <Button type="submit" variant="accent" className="rounded-xl shrink-0" disabled={linking}>
              {linking ? "جارٍ الربط..." : "ربط الطالب"}
            </Button>
          </form>
        ) : null}

        {children.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {children.map((child) => (
              <ParentChildCard
                key={child.id}
                child={child}
                active={selectedId === child.id}
                onClick={() => handleSelectChild(child.id)}
              />
            ))}
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <LoadingSkeleton />
        </div>
      ) : null}

      {!loading && children.length === 0 ? (
        <EmptyState
          title="لا يوجد طالب مربوط بعد"
          description="اطلب من ابنك فتح «حسابي» في تطبيق الطالب ونسخ كود الربط، ثم أدخله أعلاه."
        />
      ) : null}

      {!loading && student && stats ? (
        <>
          {(stats.live_sessions ?? 0) > 0 ? (
            <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-danger">جلسة مباشرة الآن</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {student.full_name} لديه {stats.live_sessions.toLocaleString("ar-EG")} جلسة مباشرة
                  </p>
                </div>
                <Button href={reportHref} type="button" variant="destructive" className="rounded-xl">
                  عرض التفاصيل
                </Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-accent/10 text-2xl font-black text-accent">
                {student.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  student.full_name?.charAt(0) || "ط"
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-text">{student.full_name}</h2>
                <p className="text-sm text-text-muted">
                  {student.grade_label || "—"}
                  {student.section ? ` · شعبة ${student.section}` : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-accent">
                  ستريك المذاكرة: {(student.streak_days ?? 0).toLocaleString("ar-EG")} يوم
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="جلسات هذا الشهر"
              value={(stats.sessions_this_month ?? 0).toLocaleString("ar-EG")}
              iconName="calendarDays"
              tone="blue"
              hint="تسجيلات آخر 30 يوماً"
            />
            <StatsCard
              title="متوسط التقدم"
              value={`${(stats.average_progress ?? 0).toLocaleString("ar-EG")}%`}
              iconName="trending"
              tone="accent"
              hint="عبر المواد الدراسية"
            />
            <StatsCard
              title="ساعات المذاكرة"
              value={(stats.study_hours ?? 0).toLocaleString("ar-EG")}
              iconName="book"
              tone="success"
              hint="من الجلسات المكتملة"
            />
            <StatsCard
              title="الأسئلة"
              value={`${(stats.questions_answered ?? 0).toLocaleString("ar-EG")}/${(stats.questions_total ?? 0).toLocaleString("ar-EG")}`}
              iconName="help"
              tone="warning"
              hint="تم الرد / الإجمالي"
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-text-muted">جلسات قادمة</p>
              <p className="mt-1 text-xl font-black text-text">
                {(stats.upcoming_sessions ?? 0).toLocaleString("ar-EG")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-text-muted">جلسات مكتملة</p>
              <p className="mt-1 text-xl font-black text-success">
                {(stats.completed_sessions ?? 0).toLocaleString("ar-EG")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-text-muted">إجمالي التسجيلات</p>
              <p className="mt-1 text-xl font-black text-text">
                {(stats.total_enrollments ?? 0).toLocaleString("ar-EG")}
              </p>
            </div>
          </section>

          {report.alerts?.length > 0 ? (
            <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <h3 className="font-bold text-warning">تنبيهات تحتاج متابعة</h3>
              <ul className="mt-2 space-y-1 text-sm text-text">
                {report.alerts.map((alert, index) => (
                  <li key={index}>• {alert.message}</li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rounded-2xl border border-success/30 bg-success/10 p-4">
              <p className="text-sm font-semibold text-success">
                أداء جيد — لا توجد مواد تحتاج تنبيه عاجلاً هذا الأسبوع.
              </p>
            </section>
          )}

          {report.subjects?.length > 0 ? (
            <section className="glass-card space-y-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-text">ملخص المواد</h3>
                <Link href={reportHref} className="text-sm font-bold text-accent hover:underline">
                  عرض الكل
                </Link>
              </div>
              {report.subjects.slice(0, 5).map((subject) => (
                <div key={subject.key}>
                  <ProgressBar label={subject.label} value={subject.progress} />
                  <p className="mt-1 text-xs text-text-muted">
                    {subject.completed.toLocaleString("ar-EG")} مكتملة من{" "}
                    {subject.total.toLocaleString("ar-EG")} جلسات
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          {report.recent_sessions?.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-lg font-black text-text">آخر النشاط</h3>
              <ul className="mt-3 divide-y divide-border">
                {report.recent_sessions.slice(0, 4).map((session) => (
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

          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold text-text">إجراءات سريعة</h3>
            <div className="flex flex-wrap gap-2">
              <Button href={reportHref} type="button" variant="accent" className="rounded-xl">
                <Icon name="book" size={18} />
                التقرير التفصيلي
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => loadDashboard(selectedId)}
              >
                تحديث البيانات
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {!loading && children.length > 0 && !student ? (
        <EmptyState
          title="تعذر عرض بيانات الطالب"
          description="جرّب التحديث أو اختر طالباً آخر من القائمة أعلاه."
        />
      ) : null}
    </div>
  );
}
