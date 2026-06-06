"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminPromotionDetailsModal from "@/components/admin/AdminPromotionDetailsModal";
import AdminPromotionFormModal from "@/components/admin/AdminPromotionFormModal";
import AdminCouponsView, {
  APPLIES_LABELS,
  DISCOUNT_LABELS,
  PromoCodeCell,
  PromoStatusCell,
  PromoUsageCell,
  TYPE_LABELS,
  formatDiscountValue,
  isPromoExpired
} from "@/components/admin/AdminCouponsPage";
import { adminPromotionsApi } from "@/lib/api";
import { formatDateAr } from "@/lib/format";

const EMPTY_FORM = {
  code: "",
  type: "coupon",
  discount_type: "percent",
  discount_value: 10,
  applies_to: "per_session",
  min_sessions: "",
  bonus_sessions: "",
  max_uses: "",
  per_user_limit: "",
  expires_at: ""
};

const statusTabs = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشطة" },
  { key: "inactive", label: "موقوفة" },
  { key: "expired", label: "منتهية" }
];

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailsPromo, setDetailsPromo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim().toUpperCase());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsRes = await adminPromotionsApi.stats();
      setStats(statsRes?.data || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadPromos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: filter
      });
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);

      const listRes = await adminPromotionsApi.list(params.toString());
      setPromos(listRes?.data || []);
      setTotalPages(listRes?.pagination?.totalPages || 1);
      setTotalCount(listRes?.pagination?.total || 0);
    } catch (err) {
      setPromos([]);
      setTotalPages(1);
      setTotalCount(0);
      setError(err.message || "تعذر تحميل العروض");
    } finally {
      setLoading(false);
    }
  }, [page, filter, typeFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadPromos()]);
  }, [loadStats, loadPromos]);

  const copyCode = async (row) => {
    try {
      await navigator.clipboard.writeText(row.code);
      toast.success("تم نسخ الكود");
    } catch {
      toast.error("تعذر نسخ الكود");
    }
  };

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(row) {
    setForm({
      code: row.code || "",
      type: row.type || "coupon",
      discount_type: row.discount_type || "percent",
      discount_value: row.discount_value ?? 10,
      applies_to: row.applies_to || "per_session",
      min_sessions: row.min_sessions ?? "",
      bonus_sessions: row.bonus_sessions ?? "",
      max_uses: row.max_uses ?? "",
      per_user_limit: row.per_user_limit ?? "",
      expires_at: row.expires_at ? row.expires_at.slice(0, 16) : ""
    });
    setEditId(row.id);
    setShowForm(true);
    setDetailsPromo(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.code.trim()) {
      toast.error("كود العرض مطلوب");
      return;
    }

    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        applies_to: form.applies_to,
        min_sessions: form.min_sessions ? Number(form.min_sessions) : undefined,
        bonus_sessions: form.bonus_sessions ? Number(form.bonus_sessions) : undefined,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null
      };

      if (editId) {
        await adminPromotionsApi.update(editId, body);
        toast.success("تم تحديث العرض");
      } else {
        await adminPromotionsApi.create(body);
        toast.success("تم إنشاء العرض");
      }

      setShowForm(false);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر حفظ العرض");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(row) {
    setMutatingId(row.id);
    try {
      await adminPromotionsApi.update(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? "تم إيقاف العرض" : "تم تفعيل العرض");
      setToggleTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر تحديث العرض");
    } finally {
      setMutatingId("");
    }
  }

  async function handleDelete(row) {
    setMutatingId(row.id);
    try {
      await adminPromotionsApi.remove(row.id);
      toast.success("تم إيقاف العرض");
      setDeleteTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إيقاف العرض");
    } finally {
      setMutatingId("");
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "code",
        label: "كود العرض",
        render: (row) => (
          <PromoCodeCell row={row} onCopy={copyCode} onView={setDetailsPromo} />
        )
      },
      {
        key: "type",
        label: "النوع",
        render: (row) => TYPE_LABELS[row.type] || row.type
      },
      {
        key: "discount",
        label: "الخصم",
        render: (row) => (
          <div>
            <p className="font-bold text-on-surface">{formatDiscountValue(row)}</p>
            <p className="text-xs text-on-surface-variant">{DISCOUNT_LABELS[row.discount_type]}</p>
          </div>
        )
      },
      {
        key: "usage",
        label: "الاستخدام",
        render: (row) => <PromoUsageCell row={row} />
      },
      {
        key: "expires_at",
        label: "تاريخ الانتهاء",
        render: (row) => (
          <span className="text-sm text-on-surface-variant">
            {row.expires_at ? formatDateAr(row.expires_at) : "بدون انتهاء"}
          </span>
        )
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <PromoStatusCell row={row} />
      },
      {
        key: "actions",
        label: "",
        render: (row) => {
          const busy = mutatingId === row.id;
          const expired = isPromoExpired(row);

          return (
            <AdminActionsMenu
              disabled={busy}
              items={[
                { label: "عرض التفاصيل", icon: "visibility", onClick: () => setDetailsPromo(row) },
                { label: "نسخ الكود", icon: "tag", onClick: () => copyCode(row) },
                { label: "تعديل", icon: "edit", onClick: () => openEdit(row) },
                {
                  label: row.is_active ? "إيقاف العرض" : "تفعيل العرض",
                  icon: row.is_active ? "lock" : "unlock",
                  onClick: () => setToggleTarget(row),
                  disabled: expired && row.is_active
                },
                {
                  label: "إيقاف نهائي",
                  icon: "close",
                  tone: "danger",
                  onClick: () => setDeleteTarget(row)
                }
              ]}
            />
          );
        }
      }
    ],
    [mutatingId]
  );

  const detailsPromoLabels = detailsPromo
    ? {
        typeLabel: TYPE_LABELS[detailsPromo.type] || detailsPromo.type,
        discountLabel: formatDiscountValue(detailsPromo),
        appliesLabel: APPLIES_LABELS[detailsPromo.applies_to] || detailsPromo.applies_to,
        expired: isPromoExpired(detailsPromo)
      }
    : null;

  return (
    <>
      <AdminCouponsView
        promos={promos}
        stats={stats}
        loading={loading}
        statsLoading={statsLoading}
        error={error}
        filter={filter}
        onFilterChange={(value) => {
          setPage(1);
          setFilter(value);
        }}
        statusTabs={statusTabs}
        typeFilter={typeFilter}
        onTypeFilterChange={(value) => {
          setPage(1);
          setTypeFilter(value);
        }}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        onRefresh={refreshAll}
        onAddPromo={openNew}
        onViewPromo={setDetailsPromo}
        onEditPromo={openEdit}
        onTogglePromo={setToggleTarget}
        onDeletePromo={setDeleteTarget}
        onCopyPromo={copyCode}
        onStatFilter={(value) => {
          setPage(1);
          setFilter(value);
        }}
        mutatingId={mutatingId}
        columns={columns}
      />

      <AdminPromotionFormModal
        open={showForm}
        editId={editId}
        form={form}
        saving={saving}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />

      <AdminPromotionDetailsModal
        open={Boolean(detailsPromo)}
        promo={detailsPromo}
        typeLabel={detailsPromoLabels?.typeLabel}
        discountLabel={detailsPromoLabels?.discountLabel}
        appliesLabel={detailsPromoLabels?.appliesLabel}
        expired={detailsPromoLabels?.expired}
        onClose={() => setDetailsPromo(null)}
        onEdit={openEdit}
        onToggle={setToggleTarget}
      />

      <AdminConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.is_active ? "إيقاف العرض" : "تفعيل العرض"}
        description={
          toggleTarget?.is_active
            ? `هل تريد إيقاف كود "${toggleTarget?.code || ""}"؟`
            : `هل تريد تفعيل كود "${toggleTarget?.code || ""}"؟`
        }
        confirmLabel={toggleTarget?.is_active ? "إيقاف" : "تفعيل"}
        tone={toggleTarget?.is_active ? "danger" : "primary"}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && handleToggle(toggleTarget)}
      />

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="إيقاف العرض"
        description={`هل تريد إيقاف كود "${deleteTarget?.code || ""}"؟ لن يُحذف من السجل بل يُوقَف عن الاستخدام.`}
        confirmLabel="إيقاف العرض"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </>
  );
}
