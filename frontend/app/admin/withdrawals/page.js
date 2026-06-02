"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import WithdrawalActionDialog from "@/components/admin/WithdrawalActionDialog";
import { dashboardApi } from "@/lib/api";
import {
  formatCurrencyEgp,
  formatDateTimeAr,
  formatWithdrawalMethod
} from "@/lib/format";
import { cn } from "@/lib/utils";

const statusTabs = [
  { key: "pending", label: "معلقة" },
  { key: "approved", label: "مقبولة" },
  { key: "paid", label: "مدفوعة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "all", label: "الكل" }
];

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState("pending");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [listRes, statsRes] = await Promise.all([
        dashboardApi.adminWithdrawals(
          new URLSearchParams({ page: String(page), limit: "20", status: statusFilter }).toString()
        ),
        dashboardApi.adminStats()
      ]);

      setWithdrawals(listRes?.data || []);
      setTotalPages(listRes?.pagination?.totalPages || 1);
      setTotalCount(listRes?.pagination?.total || 0);
      setPendingCount(statsRes?.data?.pending_withdrawals || 0);
    } catch (err) {
      setWithdrawals([]);
      setTotalPages(1);
      setTotalCount(0);
      setError(err.message || "تعذر تحميل طلبات السحب");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const openActionDialog = (withdrawal, action) => {
    setSelectedWithdrawal(withdrawal);
    setPendingAction(action);
    setDialogOpen(true);
  };

  const closeActionDialog = () => {
    setDialogOpen(false);
    setSelectedWithdrawal(null);
    setPendingAction(null);
  };

  const handleConfirmAction = async (payload) => {
    if (!selectedWithdrawal) return;

    setMutatingId(selectedWithdrawal.id);
    try {
      await dashboardApi.adminUpdateWithdrawal(selectedWithdrawal.id, payload);

      setWithdrawals((prev) =>
        prev.map((item) =>
          item.id === selectedWithdrawal.id
            ? {
                ...item,
                status: payload.status,
                notes: payload.reason || item.notes,
                processed_at: new Date().toISOString()
              }
            : item
        )
      );

      const messages = {
        approved: "تم قبول طلب السحب بنجاح",
        rejected: "تم رفض طلب السحب",
        paid: "تم تسجيل الدفع بنجاح"
      };
      toast.success(messages[payload.status] || "تم تحديث الطلب");

      setDialogOpen(false);
      setSelectedWithdrawal(null);
      setPendingAction(null);
      await loadWithdrawals();
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
          <div>
            <p className="font-bold">{row.teacher?.user?.full_name || "—"}</p>
            <p className="text-xs text-text-muted">{row.teacher?.user?.phone || "—"}</p>
          </div>
        )
      },
      {
        key: "amount",
        label: "المبلغ",
        render: (row) => <span className="font-black text-accent">{formatCurrencyEgp(row.amount)}</span>
      },
      {
        key: "method",
        label: "طريقة السحب",
        render: (row) => formatWithdrawalMethod(row.method)
      },
      {
        key: "account_number",
        label: "رقم الحساب",
        render: (row) => <span className="font-mono text-xs">{row.account_number || "—"}</span>
      },
      {
        key: "requested_at",
        label: "تاريخ الطلب",
        render: (row) => formatDateTimeAr(row.requested_at)
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

          if (row.status === "pending") {
            return (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg bg-success text-white hover:bg-green-600"
                  disabled={busy}
                  onClick={() => openActionDialog(row, "approved")}
                >
                  قبول
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={() => openActionDialog(row, "rejected")}
                >
                  رفض
                </Button>
              </div>
            );
          }

          if (row.status === "approved") {
            return (
              <Button
                type="button"
                size="sm"
                className="rounded-lg bg-accent-blue text-white hover:bg-blue-500"
                disabled={busy}
                onClick={() => openActionDialog(row, "paid")}
              >
                تم الدفع
              </Button>
            );
          }

          return <span className="text-xs text-text-muted">لا توجد إجراءات</span>;
        }
      }
    ],
    [mutatingId]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-l from-primary to-[#0f1117] p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">إدارة طلبات السحب</p>
        <h1 className="mt-1 text-2xl font-black">مراجعة واعتماد سحوبات المدرسين</h1>
        <p className="mt-2 text-sm text-white/75">
          تابع الطلبات المعلقة، وافق عليها أو ارفضها، ثم سجّل الدفع بعد التحويل.
        </p>
        {pendingCount > 0 ? (
          <p className="mt-3 inline-flex rounded-full bg-warning/20 px-3 py-1 text-sm font-bold text-warning">
            {pendingCount} طلب معلّق يحتاج مراجعة
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
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
              {tab.key === "pending" && pendingCount > 0 ? (
                <span className="mr-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/90 px-1.5 text-xs text-accent">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3">
          <p className="text-sm font-bold text-danger">⚠️ {error}</p>
          <Button type="button" onClick={loadWithdrawals} className="mt-3 rounded-xl bg-danger text-white hover:bg-red-500">
            إعادة المحاولة
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={withdrawals}
        loading={loading}
        emptyMessage="لا توجد طلبات سحب في هذا القسم"
        emptyDescription="جرّب اختيار حالة أخرى لعرض طلبات مختلفة."
        getRowClassName={(row) =>
          row.status === "pending" ? "border-r-4 border-r-warning bg-warning/5" : ""
        }
      />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="text-text-muted">
          إجمالي الطلبات في هذا القسم: <span className="font-bold text-text">{totalCount}</span>
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

      <WithdrawalActionDialog
        open={dialogOpen}
        withdrawal={selectedWithdrawal}
        action={pendingAction}
        loading={Boolean(mutatingId)}
        onClose={closeActionDialog}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
