"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminWithdrawalDetailsModal from "@/components/admin/AdminWithdrawalDetailsModal";
import AdminWithdrawalsView from "@/components/admin/AdminWithdrawalsPage";
import StatusBadge from "@/components/admin/StatusBadge";
import WithdrawalActionDialog from "@/components/admin/WithdrawalActionDialog";
import { dashboardApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr, formatWithdrawalMethod } from "@/lib/format";

const statusTabs = [
  { key: "pending", label: "معلقة" },
  { key: "approved", label: "مقبولة" },
  { key: "paid", label: "مدفوعة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "all", label: "الكل" }
];

function getTeacherName(row) {
  return row?.teacher?.user?.full_name || row?.teacher?.full_name || "—";
}

function getTeacherPhone(row) {
  return row?.teacher?.user?.phone || row?.teacher?.phone || "—";
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState("pending");
  const [methodFilter, setMethodFilter] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [detailsWithdrawal, setDetailsWithdrawal] = useState(null);
  const [actionWithdrawal, setActionWithdrawal] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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
      const res = await dashboardApi.adminWithdrawalsStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter
      });
      if (search) params.set("search", search);
      if (methodFilter) params.set("method", methodFilter);
      if (requestedFrom) params.set("requested_from", requestedFrom);
      if (requestedTo) params.set("requested_to", requestedTo);

      const listRes = await dashboardApi.adminWithdrawals(params.toString());
      setWithdrawals(listRes?.data || []);
      setTotalPages(listRes?.pagination?.totalPages || 1);
      setTotalCount(listRes?.pagination?.total || 0);
    } catch (err) {
      setWithdrawals([]);
      setTotalPages(1);
      setTotalCount(0);
      setError(err.message || "تعذر تحميل طلبات السحب");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, methodFilter, requestedFrom, requestedTo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadWithdrawals()]);
  }, [loadStats, loadWithdrawals]);

  const openActionDialog = (withdrawal, action) => {
    setActionWithdrawal(withdrawal);
    setPendingAction(action);
    setDialogOpen(true);
  };

  const closeActionDialog = () => {
    setDialogOpen(false);
    setPendingAction(null);
    setActionWithdrawal(null);
  };

  const handleConfirmAction = async (payload) => {
    if (!actionWithdrawal) return;

    setMutatingId(actionWithdrawal.id);
    try {
      await dashboardApi.adminUpdateWithdrawal(actionWithdrawal.id, payload);

      const messages = {
        approved: "تم قبول طلب السحب بنجاح",
        rejected: "تم رفض طلب السحب",
        paid: "تم تسجيل الدفع بنجاح"
      };
      toast.success(messages[payload.status] || "تم تحديث الطلب");

      const processedAt = new Date().toISOString();
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === actionWithdrawal.id
            ? { ...w, status: payload.status, notes: payload.reason || w.notes, processed_at: processedAt }
            : w
        )
      );
      setDetailsWithdrawal((prev) =>
        prev?.id === actionWithdrawal.id
          ? { ...prev, status: payload.status, notes: payload.reason || prev.notes, processed_at: processedAt }
          : prev
      );

      closeActionDialog();
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "فشل تنفيذ الإجراء");
    } finally {
      setMutatingId("");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "teacher",
        label: "المدرس",
        render: (row) => (
          <button type="button" className="text-start" onClick={() => setDetailsWithdrawal(row)}>
            <p className="font-bold text-on-surface hover:text-md-primary">{getTeacherName(row)}</p>
            <p className="text-xs text-on-surface-variant">{getTeacherPhone(row)}</p>
          </button>
        )
      },
      {
        key: "amount",
        label: "المبلغ",
        render: (row) => <span className="font-black text-md-primary">{formatCurrencyEgp(row.amount)}</span>
      },
      { key: "method", label: "طريقة السحب", render: (row) => formatWithdrawalMethod(row.method) },
      {
        key: "account_number",
        label: "رقم الحساب",
        render: (row) => (
          <span className="font-mono text-xs text-on-surface" dir="ltr">
            {row.account_number || "—"}
          </span>
        )
      },
      { key: "requested_at", label: "تاريخ الطلب", render: (row) => formatDateTimeAr(row.requested_at) },
      { key: "status", label: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => {
          const busy = mutatingId === row.id;

          const items = [
            { label: "عرض التفاصيل", icon: "creditCard", onClick: () => setDetailsWithdrawal(row) },
            row.status === "pending"
              ? {
                  label: "قبول الطلب",
                  icon: "check",
                  tone: "success",
                  disabled: busy,
                  onClick: () => openActionDialog(row, "approved")
                }
              : null,
            row.status === "pending"
              ? {
                  label: "رفض الطلب",
                  icon: "close",
                  tone: "danger",
                  disabled: busy,
                  onClick: () => openActionDialog(row, "rejected")
                }
              : null,
            row.status === "approved"
              ? {
                  label: "تسجيل الدفع",
                  icon: "money",
                  tone: "primary",
                  disabled: busy,
                  onClick: () => openActionDialog(row, "paid")
                }
              : null
          ].filter(Boolean);

          if (items.length === 1) {
            return <span className="text-xs text-on-surface-variant">لا توجد إجراءات</span>;
          }

          return <AdminActionsMenu items={items} disabled={busy} label={busy ? "جاري..." : "إجراءات"} />;
        }
      }
    ],
    [mutatingId]
  );

  const tabsWithBadge = statusTabs.map((tab) =>
    tab.key === "pending" && stats?.pending ? { ...tab, badge: stats.pending } : tab
  );

  return (
    <>
      <AdminWithdrawalsView
        withdrawals={withdrawals}
        columns={columns}
        loading={loading}
        error={error}
        stats={stats}
        statsLoading={statsLoading}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setPage(1);
          setStatusFilter(v);
        }}
        statusTabs={tabsWithBadge}
        methodFilter={methodFilter}
        onMethodFilterChange={(v) => {
          setPage(1);
          setMethodFilter(v);
        }}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        requestedFrom={requestedFrom}
        onRequestedFromChange={(v) => {
          setPage(1);
          setRequestedFrom(v);
        }}
        requestedTo={requestedTo}
        onRequestedToChange={(v) => {
          setPage(1);
          setRequestedTo(v);
        }}
        onClearDates={() => {
          setPage(1);
          setRequestedFrom("");
          setRequestedTo("");
        }}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        onRefresh={refreshAll}
        onStatFilter={(filter) => {
          setPage(1);
          setStatusFilter(filter);
        }}
      />

      <AdminWithdrawalDetailsModal
        withdrawal={detailsWithdrawal}
        busy={mutatingId === detailsWithdrawal?.id}
        onClose={() => setDetailsWithdrawal(null)}
        onApprove={(w) => openActionDialog(w, "approved")}
        onReject={(w) => openActionDialog(w, "rejected")}
        onMarkPaid={(w) => openActionDialog(w, "paid")}
      />

      <WithdrawalActionDialog
        open={dialogOpen}
        withdrawal={actionWithdrawal}
        action={pendingAction}
        loading={mutatingId === actionWithdrawal?.id}
        onClose={closeActionDialog}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}
