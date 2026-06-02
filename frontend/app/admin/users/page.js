"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { dashboardApi } from "@/lib/api";
import { formatDateAr } from "@/lib/format";
import { cn } from "@/lib/utils";

const roleTabs = [
  { key: "", label: "الكل" },
  { key: "student", label: "طلاب" },
  { key: "teacher", label: "مدرسين" },
  { key: "parent", label: "أولياء أمور" },
  { key: "admin", label: "مشرفين" }
];

const statusTabs = [
  { key: "", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "suspended", label: "موقوف" }
];

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20"
        });
        if (roleFilter) params.set("role", roleFilter);
        if (statusFilter === "active") params.set("is_active", "true");
        if (statusFilter === "suspended") params.set("is_active", "false");
        if (search) params.set("search", search);

        const payload = await dashboardApi.adminUsers(params.toString());
        if (cancelled) return;

        setUsers(payload?.data || []);
        setTotalPages(payload?.pagination?.totalPages || 1);
        setTotalUsers(payload?.pagination?.total || 0);
      } catch (err) {
        if (cancelled) return;
        setUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
        setError(err.message || "تعذر تحميل المستخدمين");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [page, roleFilter, search, statusFilter]);

  const handleVerify = async (user) => {
    if (user.role !== "teacher") return;

    setMutatingId(user.id);
    try {
      await dashboardApi.adminVerifyUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_verified: true } : u)));
      toast.success("تم تفعيل التحقق للمدرس بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل تفعيل التحقق");
    } finally {
      setMutatingId("");
    }
  };

  const handleSuspendToggle = async (user) => {
    const isSuspended = user.is_active === false;
    const actionLabel = isSuspended ? "تفعيل الحساب" : "تعليق الحساب";
    const confirmed = window.confirm(`هل تريد ${actionLabel} للمستخدم ${user.full_name || "هذا المستخدم"}؟`);
    if (!confirmed) return;

    setMutatingId(user.id);
    const updater = isSuspended ? dashboardApi.adminActivateUser : dashboardApi.adminSuspendUser;

    try {
      await updater(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: isSuspended } : u)));
      toast.success(isSuspended ? "تم تفعيل الحساب بنجاح" : "تم تعليق الحساب بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل تحديث حالة الحساب");
    } finally {
      setMutatingId("");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "full_name",
        label: "الاسم",
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
              {(row.full_name || "?").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold">{row.full_name || "—"}</p>
              <p className="truncate text-xs text-text-muted">{row.email || "—"}</p>
            </div>
          </div>
        )
      },
      {
        key: "role",
        label: "الدور",
        render: (row) => <RoleBadge role={row.role} />
      },
      {
        key: "created_at",
        label: "تاريخ التسجيل",
        render: (row) => formatDateAr(row.created_at)
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.is_active === false ? "suspended" : "active"} />
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => {
          const busy = mutatingId === row.id;
          const canVerify = row.role === "teacher" && row.is_verified !== true;

          return (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-lg">
                عرض الملف
              </Button>

              {canVerify ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg bg-accent-blue text-white hover:bg-blue-500"
                  disabled={busy}
                  onClick={() => handleVerify(row)}
                >
                  {busy ? "جاري..." : "تفعيل التحقق"}
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                variant={row.is_active === false ? "default" : "destructive"}
                className={cn(row.is_active === false ? "bg-success text-white hover:bg-green-500" : "", "rounded-lg")}
                disabled={busy}
                onClick={() => handleSuspendToggle(row)}
              >
                {busy ? "جاري..." : row.is_active === false ? "تفعيل الحساب" : "تعليق الحساب"}
              </Button>
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
        <p className="text-sm text-white/70">إدارة المستخدمين</p>
        <h1 className="mt-1 text-2xl font-black">متابعة كل الحسابات من مكان واحد</h1>
        <p className="mt-2 text-sm text-white/75">
          ابحث، فلتر، وفعّل إجراءات التحقق والتعليق مع الحفاظ على تجربة سريعة وواضحة.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
            className="h-11 rounded-xl border border-border px-4 text-sm font-cairo focus:border-accent focus:outline-none"
          />

          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
            }}
            className="h-11 min-w-[170px] rounded-xl border border-border px-3 text-sm font-cairo focus:border-accent focus:outline-none"
          >
            {roleTabs.map((tab) => (
              <option key={tab.key || "all"} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="h-11 min-w-[170px] rounded-xl border border-border px-3 text-sm font-cairo focus:border-accent focus:outline-none"
          >
            {statusTabs.map((tab) => (
              <option key={tab.key || "all"} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm font-semibold text-danger">
          ⚠️ {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="لا يوجد مستخدمون مطابقون للفلاتر"
        emptyDescription="جرّب تغيير البحث أو الفلاتر لعرض نتائج مختلفة."
      />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="text-text-muted">إجمالي المستخدمين: <span className="font-bold text-text">{totalUsers}</span></p>

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
    </div>
  );
}
