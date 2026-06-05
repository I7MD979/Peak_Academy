"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/StatsCard";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { logApiError, teacherApi } from "@/lib/api";
import { formatCurrencyEgp } from "@/lib/format";

const PIE_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#64748b"];

function ChartCard({ title, children, empty }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-black text-text">{title}</h3>
      {empty ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
          <p className="text-sm text-text-muted">لا توجد بيانات للفترة المحددة</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export default function TeacherAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await teacherApi.analytics();
      setData(res?.data || null);
    } catch (err) {
      logApiError("teacher/analytics", err);
      setData(null);
      setError(err.message || "تعذر تحميل التحليلات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sessionsWeek = data?.sessions_per_week || [];
  const earningsMonth = data?.earnings_per_month || [];
  const subjects = data?.subject_distribution || [];

  const hasSessions = sessionsWeek.some((w) => w.sessions > 0);
  const hasEarnings = earningsMonth.some((m) => m.earnings > 0);
  const hasSubjects = subjects.length > 0;

  if (!loading && !error && !data) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon="📊"
          title="لا توجد تحليلات بعد"
          description="ستظهر إحصائياتك بعد إنشاء جلسات واستقبال طلاب."
          action={{ label: "إنشاء جلسة جديدة", href: "/teacher/sessions/new" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border border-border bg-gradient-to-l from-primary/5 via-card to-accent/5 p-5 shadow-sm">
        <p className="text-xs font-bold text-accent">تحليلاتي</p>
        <h1 className="mt-1 text-2xl font-black text-primary">إحصائيات أدائك التعليمي</h1>
        <p className="mt-2 text-sm text-text-muted">
          تابع جلساتك، أرباحك، وولاء طلابك خلال الأسابيع والأشهر الأخيرة.
        </p>
        <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={load} disabled={loading}>
          تحديث
        </Button>
      </section>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              title="طلاب فريدون"
              value={(data?.unique_students ?? 0).toLocaleString("ar-EG")}
              iconName="users"
              tone="blue"
            />
            <StatsCard
              title="طلاب متكررون"
              value={(data?.repeat_students ?? 0).toLocaleString("ar-EG")}
              iconName="user"
              tone="accent"
              hint={`نسبة الاحتفاظ: ${(data?.retention_rate ?? 0).toLocaleString("ar-EG")}%`}
            />
            <StatsCard
              title="متوسط التقييم"
              value={Number(data?.average_rating ?? 0).toFixed(1)}
              iconName="star"
              tone="warning"
            />
            <StatsCard
              title="جلسات (4 أسابيع)"
              value={sessionsWeek
                .reduce((s, w) => s + (w.sessions || 0), 0)
                .toLocaleString("ar-EG")}
              iconName="calendarDays"
              tone="success"
            />
          </>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="الجلسات أسبوعيًا (آخر 4 أسابيع)" empty={!hasSessions}>
          <div className="h-[280px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sessionsWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sessions" name="جلسات" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="الأرباح الشهرية (آخر 6 أشهر)" empty={!hasEarnings}>
          <div className="h-[280px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={earningsMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrencyEgp(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  name="الأرباح"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="توزيع الجلسات حسب المادة" empty={!hasSubjects}>
        <div className="h-[300px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={subjects}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {subjects.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
