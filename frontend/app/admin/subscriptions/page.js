"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

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

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const res = await adminApi.getPlans();
      setPlans(res?.data || []);
    } catch {
      toast.error("تعذر تحميل الخطط");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

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
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.price || !form.sessions_per_month) {
      toast.error("الاسم والسعر وعدد الحصص مطلوبة");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        price: Number(form.price),
        sessions_per_month: Number(form.sessions_per_month),
        sort_order: Number(form.sort_order),
        features: form.features
          .split("\n")
          .map((f) => f.trim())
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
      await loadPlans();
    } catch (err) {
      toast.error(err.message || "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(plan) {
    try {
      await adminApi.updatePlan(plan.id, { is_active: !plan.is_active });
      toast.success(plan.is_active ? "تم إيقاف الخطة" : "تم تفعيل الخطة");
      await loadPlans();
    } catch {
      toast.error("تعذر التحديث");
    }
  }

  async function handleDelete(plan) {
    if (!confirm(`هل تريد حذف خطة "${plan.name}"؟`)) return;
    try {
      await adminApi.deletePlan(plan.id);
      toast.success("تم إيقاف الخطة");
      await loadPlans();
    } catch (err) {
      toast.error(err.message || "تعذر الحذف");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">خطط الاشتراك</h1>
          <p className="mt-1 text-sm text-text-muted">إدارة خطط الاشتراك الشهرية وعرضها على صفحة الهبوط</p>
        </div>
        <Button variant="accent" className="rounded-xl" onClick={openNew}>
          <Icon name="plus" size={16} />
          خطة جديدة
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold text-text">{editId ? "تعديل الخطة" : "خطة جديدة"}</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">اسم الخطة *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Gold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">السعر (جنيه) *</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="499"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">حصص / شهر *</label>
              <Input
                type="number"
                value={form.sessions_per_month}
                onChange={(e) => setForm((p) => ({ ...p, sessions_per_month: e.target.value }))}
                placeholder="10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted">وصف مختصر</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="الخطة المثالية للطالب الجاد"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted">المميزات (كل ميزة في سطر)</label>
            <textarea
              value={form.features}
              onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={"10 حصص كل شهر\nجميع المواد والمعلمين"}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">الترتيب</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-text-muted">تسمية مميزة (اختياري)</label>
              <Input
                value={form.featured_label}
                onChange={(e) => setForm((p) => ({ ...p, featured_label: e.target.value }))}
                placeholder="الأكثر طلباً"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold">نشطة</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold">مميزة (Highlighted)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="accent" className="rounded-xl" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : editId ? "حفظ التغييرات" : "إنشاء الخطة"}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "rounded-2xl border bg-card p-4",
              plan.is_featured ? "border-accent/40" : "border-border",
              !plan.is_active && "opacity-60"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text">{plan.name}</h3>
                  {plan.is_featured ? (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                      {plan.featured_label || "مميز"}
                    </span>
                  ) : null}
                  {!plan.is_active ? (
                    <span className="rounded-full bg-border px-2 py-0.5 text-xs text-text-muted">موقف</span>
                  ) : (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">نشط</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-text-muted">
                  {plan.price} جنيه / شهر — {plan.sessions_per_month} حصص
                </p>
                {plan.description ? <p className="mt-1 text-xs text-text-muted">{plan.description}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => openEdit(plan)}>
                  تعديل
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => handleToggle(plan)}>
                  {plan.is_active ? "إيقاف" : "تفعيل"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-danger hover:bg-danger/10"
                  onClick={() => handleDelete(plan)}
                >
                  حذف
                </Button>
              </div>
            </div>
            {plan.features?.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text-muted">
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
