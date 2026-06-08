"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminUserDetailsModal from "@/components/admin/AdminUserDetailsModal";
import AdminUserEditModal from "@/components/admin/AdminUserEditModal";
import AdminUsersView from "@/components/admin/AdminUsersPage";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { dashboardApi } from "@/lib/api";
import { formatDateAr } from "@/lib/format";
import { ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

const roleBadgeClass = {
  student: "bg-accent-blue/10 text-accent-blue",
  teacher: "bg-accent/10 text-accent",
  parent: "bg-secondary-container/30 text-secondary",
  admin: "bg-primary-container/20 text-md-primary"
};

function RoleBadge({ role }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", roleBadgeClass[role] || "bg-surface-container-highest text-on-surface-variant")}>
      {ROLE_LABELS_AR[role] || role || "—"}
    </span>
  );
}

function canModifyUser(user, currentUserId) {
  if (!user) return false;
  if (user.id === currentUserId) return false;
  if (user.role === "admin") return false;
  return true;
}

export default function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || "";

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await dashboardApi.adminUsersStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter === "active") params.set("is_active", "true");
      if (statusFilter === "suspended") params.set("is_active", "false");
      if (search) params.set("search", search);
      if (createdFrom) params.set("created_from", createdFrom);
      if (createdTo) params.set("created_to", createdTo);

      const payload = await dashboardApi.adminUsers(params.toString());
      setUsers(payload?.data || []);
      setTotalPages(payload?.pagination?.totalPages || 1);
      setTotalUsers(payload?.pagination?.total || 0);
    } catch (err) {
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
      setError(err.message || "تعذر تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, statusFilter, createdFrom, createdTo]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadUsers()]);
  }, [loadStats, loadUsers]);

  const patchUser = useCallback((userId, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
    setSelectedUser((prev) => (prev?.id === userId ? { ...prev, ...patch } : prev));
  }, []);

  // ── Open detail view ──────────────────────────────────────────────────────
  const openDetail = useCallback(async (user) => {
    setSelectedUser(user);
    setSelectedDetail(null);
    setDetailLoading(true);
    try {
      const res = await dashboardApi.adminUserDetail(user.id);
      setSelectedDetail(res?.data || null);
    } catch {
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleVerify = async (user) => {
    if (user.role !== "teacher" || user.is_verified === true) return;
    setMutatingId(user.id);
    try {
      await dashboardApi.adminVerifyUser(user.id);
      patchUser(user.id, { is_verified: true });
      toast.success("تم توثيق المدرس بنجاح");
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.message || "فشل توثيق المدرس");
    } finally {
      setMutatingId("");
    }
  };

  const executeSuspendToggle = async (user) => {
    if (!canModifyUser(user, currentUserId)) {
      toast.error("لا يمكن تنفيذ هذا الإجراء على هذا الحساب");
      return;
    }
    const isSuspended = user.is_active === false;
    setMutatingId(user.id);
    const updater = isSuspended ? dashboardApi.adminActivateUser : dashboardApi.adminSuspendUser;
    try {
      await updater(user.id);
      patchUser(user.id, { is_active: isSuspended });
      toast.success(isSuspended ? "تم تفعيل الحساب بنجاح" : "تم تعليق الحساب بنجاح");
      await loadStats();
    } catch (err) {
      toast.error(err.message || "فشل تحديث حالة الحساب");
    } finally {
      setMutatingId("");
      setConfirmAction(null);
    }
  };

  const executeDelete = async (user) => {
    if (!canModifyUser(user, currentUserId)) {
      toast.error("لا يمكن حذف هذا الحساب");
      return;
    }
    setMutatingId(user.id);
    try {
      await dashboardApi.adminDeleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotalUsers((prev) => Math.max(0, prev - 1));
      setSelectedUser(null);
      toast.success("تم حذف الحساب");
      await loadStats();
    } catch (err) {
      toast.error(err.message || "فشل حذف الحساب");
    } finally {
      setMutatingId("");
      setConfirmAction(null);
    }
  };

  const handleStatFilter = ({ role, status }) => {
    setPage(1);
    setRoleFilter(role);
    setStatusFilter(status);
  };

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: "full_name",
        label: "المستخدم",
        render: (row) => (
          <button
            type="button"
            className="flex w-full items-center gap-3 text-start"
            onClick={() => openDetail(row)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-md-primary/15 text-sm font-black text-md-primary">
              {row.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (row.full_name || "?").slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-on-surface">{row.full_name || "—"}</p>
              <p className="truncate text-xs text-on-surface-variant" dir="ltr">{row.email || "—"}</p>
            </div>
          </button>
        )
      },
      { key: "role", label: "الدور", render: (row) => <RoleBadge role={row.role} /> },
      {
        key: "verification",
        label: "التوثيق",
        render: (row) => {
          if (row.role !== "teacher") return <span className="text-xs text-on-surface-variant">—</span>;
          return (
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", row.is_verified ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
              {row.is_verified ? "موثّق" : "بانتظار التوثيق"}
            </span>
          );
        }
      },
      { key: "created_at", label: "تاريخ التسجيل", render: (row) => formatDateAr(row.created_at) },
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
          const modifiable = canModifyUser(row, currentUserId);
          const isSelf = row.id === currentUserId;

          const items = [
            { label: "عرض الملف", icon: "user", onClick: () => openDetail(row) },
            modifiable
              ? { label: "تعديل البيانات", icon: "edit", onClick: () => setEditUser(row) }
              : null,
            canVerify
              ? {
                  label: "توثيق المدرس",
                  icon: "check",
                  tone: "primary",
                  disabled: busy,
                  onClick: () => setConfirmAction({ type: "verify", user: row })
                }
              : null,
            modifiable
              ? {
                  label: row.is_active === false ? "تفعيل الحساب" : "تعليق الحساب",
                  icon: row.is_active === false ? "unlock" : "lock",
                  tone: row.is_active === false ? "success" : "danger",
                  disabled: busy,
                  onClick: () => setConfirmAction({ type: "suspend", user: row })
                }
              : isSelf
                ? { label: "حسابك الحالي", disabled: true }
                : row.role === "admin"
                  ? { label: "حساب مشرف", disabled: true }
                  : null,
            modifiable
              ? {
                  label: "حذف الحساب",
                  icon: "trash",
                  tone: "danger",
                  disabled: busy,
                  onClick: () => setConfirmAction({ type: "delete", user: row })
                }
              : null
          ].filter(Boolean);

          return (
            <AdminActionsMenu
              items={items}
              disabled={busy}
              label={busy ? "جاري..." : "إجراءات"}
            />
          );
        }
      }
    ],
    [currentUserId, mutatingId, openDetail]
  );

  const confirmUser = confirmAction?.user;
  const confirmType = confirmAction?.type;
  const isSuspend = confirmType === "suspend" && confirmUser?.is_active !== false;
  const isVerify = confirmType === "verify";
  const isDelete = confirmType === "delete";

  return (
    <>
      <AdminUsersView
        users={users}
        columns={columns}
        loading={loading}
        error={error}
        stats={stats}
        statsLoading={statsLoading}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => { setPage(1); setRoleFilter(v); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setPage(1); setStatusFilter(v); }}
        createdFrom={createdFrom}
        onCreatedFromChange={(v) => { setPage(1); setCreatedFrom(v); }}
        createdTo={createdTo}
        onCreatedToChange={(v) => { setPage(1); setCreatedTo(v); }}
        onClearDates={() => { setPage(1); setCreatedFrom(""); setCreatedTo(""); }}
        page={page}
        totalPages={totalPages}
        totalUsers={totalUsers}
        onPageChange={setPage}
        onRefresh={refreshAll}
        onStatFilter={handleStatFilter}
      />

      <AdminUserDetailsModal
        user={selectedUser}
        detail={selectedDetail}
        busy={mutatingId === selectedUser?.id || detailLoading}
        currentUserId={currentUserId}
        onClose={() => { setSelectedUser(null); setSelectedDetail(null); }}
        onVerify={(user) => setConfirmAction({ type: "verify", user })}
        onSuspendToggle={(user) => setConfirmAction({ type: "suspend", user })}
        onEdit={(user) => setEditUser(user)}
      />

      {editUser ? (
        <AdminUserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={(updated) => {
            patchUser(updated.id, updated);
            setEditUser(null);
          }}
        />
      ) : null}

      <AdminConfirmDialog
        open={Boolean(confirmUser)}
        title={
          isVerify
            ? "توثيق المدرس"
            : isDelete
              ? "حذف الحساب"
              : isSuspend
                ? "تعليق الحساب"
                : "تفعيل الحساب"
        }
        description={
          isVerify
            ? `هل تريد توثيق حساب المدرس ${confirmUser?.full_name || ""}؟ سيظهر كمدرس معتمد على المنصة.`
            : isDelete
              ? `هل تريد حذف حساب ${confirmUser?.full_name || "هذا المستخدم"}؟ هذا الإجراء يوقف الحساب ولا يمكن التراجع عنه بسهولة.`
              : isSuspend
                ? `هل تريد تعليق حساب ${confirmUser?.full_name || "هذا المستخدم"}؟ لن يتمكن من تسجيل الدخول.`
                : `هل تريد تفعيل حساب ${confirmUser?.full_name || "هذا المستخدم"}؟`
        }
        confirmLabel={
          isVerify
            ? "توثيق المدرس"
            : isDelete
              ? "حذف الحساب"
              : isSuspend
                ? "تعليق الحساب"
                : "تفعيل الحساب"
        }
        tone={isVerify ? "primary" : isDelete || isSuspend ? "danger" : "success"}
        loading={mutatingId === confirmUser?.id}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmUser) return;
          if (isVerify) handleVerify(confirmUser);
          else if (isDelete) executeDelete(confirmUser);
          else executeSuspendToggle(confirmUser);
        }}
      />
    </>
  );
}
