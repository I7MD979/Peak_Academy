"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/admin/StatsCard";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { dashboardApi, sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateAr, formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

const roleLabels = {
  student: "طالب",
  teacher: "مدرس",
  parent: "ولي أمر",
  admin: "مشرف"
};

const roleBadgeClass = {
  student: "bg-accent-blue/10 text-accent-blue",
  teacher: "bg-accent/10 text-accent",
  parent: "bg-purple-100 text-purple-700",
  admin: "bg-primary/10 text-primary"
};

function RoleBadge({ role }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", roleBadgeClass[role] || "bg-slate-100 text-slate-600")}>
      {roleLabels[role] || role || "—"}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statsRes, usersRes, sessionsRes] = await Promise.all([
        dashboardApi.adminStats(),
        dashboardApi.adminUsers("limit=5"),
        sessionsApi.list("limit=5&status=scheduled")
      ]);

      setStats(statsRes?.data || null);
      setRecentUsers(usersRes?.data || []);
      setRecentSessions(sessionsRes?.data || []);
    } catch (err) {
      setStats(null);
      setRecentUsers([]);
      setRecentSessions([]);
      setError(err.message || "تعذر تحميل بيانات لوحة التحكم. تأكد أن الخادم يعمل.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const sessionColumns = useMemo(
    () => [
      { key: "title", label: "العنوان", render: (row) => <span className="font-bold">{row.title}</span> },
      {
        key: "teacher",
        label: "المدرس",
        render: (row) => row.teacher?.full_name || "—"
      },
      {
        key: "subject",
        label: "المادة",
        render: (row) => row.subject?.name_ar || row.subject || "—"
      },
      {
        key: "scheduled_at",
        label: "الموعد",
        render: (row) => formatDateTimeAr(row.scheduled_at)
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status || "scheduled"} />
      }
    ],
    []
  );

  const userColumns = useMemo(
    () => [
      { key: "full_name", label: "الاسم", render: (row) => <span className="font-bold">{row.full_name || "—"}</span> },
      { key: "role", label: "الدور", render: (row) => <RoleBadge role={row.role} /> },
      {
        key: "created_at",
        label: "تاريخ التسجيل",
        render: (row) => formatDateAr(row.created_at)
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.is_active === false ? "suspended" : "active"} />
      }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-l from-primary to-[#0f1117] p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">مرحبًا بك في لوحة الإدارة</p>
        <h2 className="mt-1 text-2xl font-black">متابعة المنصة في مكان واحد</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          راقب الإيرادات، المستخدمين، الجلسات المباشرة، وطلبات السحب بشكل لحظي.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/users">
            <Button className="rounded-xl bg-accent text-white hover:bg-orange-600">إدارة المستخدمين</Button>
          </Link>
          <Link href="/admin/withdrawals">
            <Button variant="outline" className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              طلبات السحب
            </Button>
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm font-bold text-danger">⚠️ {error}</p>
          <Button type="button" onClick={loadDashboard} className="mt-3 rounded-xl bg-danger text-white hover:bg-red-500">
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="إجمالي إيرادات المنصة"
          value={loading ? "..." : formatCurrencyEgp(stats?.total_revenue)}
          iconName="money"
          tone="success"
          hint="من بداية تشغيل المنصة"
        />
        <StatsCard
          title="إجمالي المستخدمين"
          value={loading ? "..." : String(stats?.total_users ?? 0)}
          iconName="users"
          tone="blue"
        />
        <StatsCard
          title="جلسات مباشرة الآن"
          value={loading ? "..." : String(stats?.live_sessions ?? 0)}
          iconName="video"
          tone="accent"
          hint="جلسات بحالة Live"
        />
        <StatsCard
          title="سحوبات معلّقة"
          value={loading ? "..." : String(stats?.pending_withdrawals ?? 0)}
          iconName="creditCard"
          tone="warning"
          hint="تحتاج مراجعة"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-primary">أحدث الجلسات</h3>
            <Link href="/admin/sessions" className="text-sm font-bold text-accent hover:underline">
              عرض الكل
            </Link>
          </div>
          <DataTable
            columns={sessionColumns}
            data={recentSessions}
            loading={loading}
            emptyMessage="لا توجد جلسات حالياً"
            emptyDescription="ستظهر هنا آخر الجلسات المجدولة على المنصة."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-primary">أحدث التسجيلات</h3>
            <Link href="/admin/users" className="text-sm font-bold text-accent hover:underline">
              عرض الكل
            </Link>
          </div>
          <DataTable
            columns={userColumns}
            data={recentUsers}
            loading={loading}
            emptyMessage="لا يوجد مستخدمون جدد"
            emptyDescription="ستظهر هنا آخر الحسابات المسجّلة."
          />
        </div>
      </section>
    </div>
  );
}
