"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminPlanDetailsModal from "@/components/admin/AdminPlanDetailsModal";
import AdminPlanFormModal from "@/components/admin/AdminPlanFormModal";
import AdminSubscriptionsView from "@/components/admin/AdminSubscriptionsPage";
import { adminApi } from "@/lib/api";

const EMPTY_FORM = {
  name: "",
  price: "",
  sessions_per_month: "",
  description: "",
  features: "",
  is_active: true,
  is_featured: false,
  featured_label: "",
  sort_order: 0
};

const statusTabs = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشطة" },
  { key: "inactive", label: "موقوفة" },
  { key: "featured", label: "مميزة" }
];

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sort_order");

  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [detailsPlan, setDetailsPlan] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminApi.plansStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (search) params.set("search", search);

      const res = await adminApi.getPlans(params.toString());
      setPlans(res?.data || []);
    } catch (err) {
      setPlans([]);
      setError(err.message || "تعذر تحميل خطط الاشتراك");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadPlans()]);
  }, [loadStats, loadPlans]);

  function openEdit(plan) {
    setForm({
      name: plan.name,
      price: String(plan.price),
      sessions_per_month: String(plan.sessions_per_month),
      description: plan.description || "",
      features: (plan.features || []).join("\n"),
      is_active: plan.is_active,
      is_featured: plan.is_featured || false,
      featured_label: plan.featured_label || "",
      sort_order: plan.sort_order || 0
    });
    setEditId(plan.id);
    setShowForm(true);
    setDetailsPlan(null);
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.price || !form.sessions_per_month) {
      toast.error("الاسم والسعر وعدد الحصص مطلوبة");
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        price: Number(form.price),
        sessions_per_month: Number(form.sessions_per_month),
        sort_order: Number(form.sort_order) || 0,
        features: form.features
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      };

      if (editId) {
        await adminApi.updatePlan(editId, body);
        toast.success("تم تحديث الخطة");
      } else {
        await adminApi.createPlan(body);
        toast.success("تم إنشاء الخطة");
      }

      setShowForm(false);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر حفظ الخطة");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(plan) {
    setMutatingId(plan.id);
    try {
      await adminApi.updatePlan(plan.id, { is_active: !plan.is_active });
      toast.success(plan.is_active ? "تم إيقاف الخطة" : "تم تفعيل الخطة");
      setToggleTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر تحديث الخطة");
    } finally {
      setMutatingId("");
    }
  }

  async function handleDelete(plan) {
    setMutatingId(plan.id);
    try {
      await adminApi.deletePlan(plan.id);
      toast.success("تم إيقاف الخطة");
      setDeleteTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "تعذر إيقاف الخطة");
    } finally {
      setMutatingId("");
    }
  }

  return (
    <>
      <AdminSubscriptionsView
        plans={plans}
        stats={stats}
        loading={loading}
        statsLoading={statsLoading}
        error={error}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusTabs={statusTabs}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onRefresh={refreshAll}
        onAddPlan={openNew}
        onViewPlan={setDetailsPlan}
        onEditPlan={openEdit}
        onTogglePlan={setToggleTarget}
        onDeletePlan={setDeleteTarget}
        onStatFilter={setStatusFilter}
        mutatingId={mutatingId}
      />

      <AdminPlanFormModal
        open={showForm}
        editId={editId}
        form={form}
        saving={saving}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />

      <AdminPlanDetailsModal
        open={Boolean(detailsPlan)}
        plan={detailsPlan}
        onClose={() => setDetailsPlan(null)}
        onEdit={openEdit}
        onToggle={setToggleTarget}
      />

      <AdminConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.is_active ? "إيقاف خطة الاشتراك" : "تفعيل خطة الاشتراك"}
        description={
          toggleTarget?.is_active
            ? `هل تريد إيقاف خطة "${toggleTarget?.name || ""}"؟ لن تظهر للطلاب الجدد.`
            : `هل تريد تفعيل خطة "${toggleTarget?.name || ""}"؟`
        }
        confirmLabel={toggleTarget?.is_active ? "إيقاف الخطة" : "تفعيل الخطة"}
        tone={toggleTarget?.is_active ? "danger" : "primary"}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && handleToggle(toggleTarget)}
      />

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="إيقاف خطة الاشتراك"
        description={`هل تريد إيقاف خطة "${deleteTarget?.name || ""}" نهائياً؟ ${
          (deleteTarget?.active_subscribers || 0) > 0
            ? "لا يمكن الإيقاف — يوجد مشتركون نشطون."
            : "لن تُحذف من السجل بل تُوقَف عن العرض."
        }`}
        confirmLabel="إيقاف الخطة"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </>
  );
}
