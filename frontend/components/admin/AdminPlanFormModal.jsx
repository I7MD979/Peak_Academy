"use client";

import AdminCheckbox from "@/components/admin/AdminCheckbox";
import Icon from "@/components/shared/Icon";
import { Input } from "@/components/ui/input";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminLabel,
  adminModalOverlay
} from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

export default function AdminPlanFormModal({
  open,
  editId,
  form,
  saving,
  onChange,
  onClose,
  onSubmit
}) {
  if (!open) return null;

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="plan-form-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-high p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-on-surface-variant">
              {editId ? "تعديل باقة" : "باقة جديدة"}
            </p>
            <h2 id="plan-form-title" className="text-lg font-black text-on-surface">
              {editId ? "تحديث خطة الاشتراك" : "إنشاء خطة اشتراك"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface"
            aria-label="إغلاق"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className={adminLabel}>اسم الخطة *</label>
              <Input
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="الخطة الذهبية"
                className={adminInput}
                required
              />
            </div>
            <div className="space-y-1">
              <label className={adminLabel}>السعر (جنيه) *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => onChange({ price: e.target.value })}
                placeholder="499"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-1">
              <label className={adminLabel}>حصص / شهر *</label>
              <Input
                type="number"
                min="1"
                value={form.sessions_per_month}
                onChange={(e) => onChange({ sessions_per_month: e.target.value })}
                placeholder="10"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={adminLabel}>وصف مختصر</label>
            <Input
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="الخطة المثالية للطالب الجاد"
              className={adminInput}
            />
          </div>

          <div className="space-y-1">
            <label className={adminLabel}>المميزات (كل ميزة في سطر)</label>
            <textarea
              value={form.features}
              onChange={(e) => onChange({ features: e.target.value })}
              rows={4}
              className={cn(adminInput, "h-auto resize-y py-2")}
              placeholder={"١٠ حصص كل شهر\nجميع المواد والمعلمين\nأولوية الحجز"}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className={adminLabel}>الترتيب</label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => onChange({ sort_order: e.target.value })}
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className={adminLabel}>تسمية مميزة (اختياري)</label>
              <Input
                value={form.featured_label}
                onChange={(e) => onChange({ featured_label: e.target.value })}
                placeholder="الأكثر طلباً"
                className={adminInput}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl border border-outline-variant bg-surface-container-low/50 p-4">
            <AdminCheckbox
              id="plan-active"
              label="نشطة"
              checked={form.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
            />
            <AdminCheckbox
              id="plan-featured"
              label="مميزة على صفحة الهبوط"
              checked={form.is_featured}
              onChange={(e) => onChange({ is_featured: e.target.checked })}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : editId ? "حفظ التغييرات" : "إنشاء الخطة"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={saving}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
