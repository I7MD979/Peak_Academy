"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminLandingStatModal from "@/components/admin/AdminLandingStatModal";
import AdminLandingView, {
  LandingStatKeyCell,
  LandingStatValueCell,
  LandingStatVisibilityCell
} from "@/components/admin/AdminLandingPage";
import { adminApi } from "@/lib/api";
import { formatDateAr } from "@/lib/format";

const EMPTY_FORM = {
  label: "",
  value: "",
  hint: "",
  sort_order: 0,
  is_visible: true
};

export default function AdminLandingRoute() {
  const [stats, setStats] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [editStat, setEditStat] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await adminApi.landingStatsOverview();
      setOverview(res?.data || null);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ visibility: visibilityFilter });
      if (search) params.set("search", search);

      const res = await adminApi.getLandingStats(params.toString());
      setStats(res?.data || []);
    } catch (err) {
      setStats([]);
      setError(err.message || "تعذر تحميل إحصائيات الهبوط");
    } finally {
      setLoading(false);
    }
  }, [visibilityFilter, search]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadStats()]);
  }, [loadOverview, loadStats]);

  function openEdit(stat) {
    setEditStat(stat);
    setForm({
      label: stat.label || "",
      value: stat.value || "",
      hint: stat.hint || "",
      sort_order: stat.sort_order ?? 0,
      is_visible: Boolean(stat.is_visible)
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editStat?.id) return;

    setSaving(true);
    try {
      await adminApi.updateLandingStat(editStat.id, {
        label: form.label.trim(),
        value: form.value.trim(),
        hint: form.hint.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_visible: form.is_visible
      });
      toast.success("تم تحديث الإحصائية");
      setEditStat(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility(stat) {
    setMutatingId(stat.id);
    try {
      await adminApi.updateLandingStat(stat.id, { is_visible: !stat.is_visible });
      toast.success(stat.is_visible ? "تم إخفاء الإحصائية" : "تم إظهار الإحصائية");
      setToggleTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر تحديث الإحصائية");
    } finally {
      setMutatingId("");
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "label",
        label: "العنوان",
        render: (row) => <span className="font-semibold text-on-surface">{row.label}</span>
      },
      {
        key: "key",
        label: "المفتاح",
        render: (row) => <LandingStatKeyCell row={row} />
      },
      {
        key: "value",
        label: "القيمة",
        render: (row) => <LandingStatValueCell row={row} />
      },
      {
        key: "hint",
        label: "الوصف",
        render: (row) => (
          <span className="text-sm text-on-surface-variant">{row.hint || "—"}</span>
        )
      },
      {
        key: "sort_order",
        label: "الترتيب",
        render: (row) => (
          <span className="font-mono text-sm text-on-surface" dir="ltr">
            {row.sort_order ?? 0}
          </span>
        )
      },
      {
        key: "is_visible",
        label: "الحالة",
        render: (row) => <LandingStatVisibilityCell row={row} />
      },
      {
        key: "updated_at",
        label: "آخر تحديث",
        render: (row) => (
          <span className="text-xs text-on-surface-variant">
            {row.updated_at ? formatDateAr(row.updated_at) : "—"}
          </span>
        )
      },
      {
        key: "actions",
        label: "",
        render: (row) => (
          <AdminActionsMenu
            disabled={mutatingId === row.id}
            items={[
              { label: "تعديل", icon: "edit", onClick: () => openEdit(row) },
              {
                label: row.is_visible ? "إخفاء من الهبوط" : "إظهار على الهبوط",
                icon: row.is_visible ? "lock" : "unlock",
                onClick: () => setToggleTarget(row)
              }
            ]}
          />
        )
      }
    ],
    [mutatingId]
  );

  return (
    <>
      <AdminLandingView
        stats={stats}
        overview={overview}
        loading={loading}
        overviewLoading={overviewLoading}
        error={error}
        visibilityFilter={visibilityFilter}
        onVisibilityFilterChange={setVisibilityFilter}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onRefresh={refreshAll}
        columns={columns}
      />

      <AdminLandingStatModal
        open={Boolean(editStat)}
        stat={editStat}
        form={form}
        saving={saving}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={() => setEditStat(null)}
        onSubmit={handleSubmit}
      />

      <AdminConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.is_visible ? "إخفاء الإحصائية" : "إظهار الإحصائية"}
        description={
          toggleTarget?.is_visible
            ? `هل تريد إخفاء "${toggleTarget?.label || ""}" من صفحة الهبوط؟`
            : `هل تريد إظهار "${toggleTarget?.label || ""}" على صفحة الهبوط؟`
        }
        confirmLabel={toggleTarget?.is_visible ? "إخفاء" : "إظهار"}
        tone={toggleTarget?.is_visible ? "danger" : "primary"}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && handleToggleVisibility(toggleTarget)}
      />
    </>
  );
}
