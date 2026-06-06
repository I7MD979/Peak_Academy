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

export default function AdminLandingStatModal({
  open,
  stat,
  saving,
  form,
  onChange,
  onClose,
  onSubmit
}) {
  if (!open || !stat) return null;

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="landing-stat-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-high p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-md-primary/15 text-md-primary">
              <Icon name="globe" size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant">تعديل إحصائية الهبوط</p>
              <h2 id="landing-stat-title" className="text-lg font-black text-on-surface">
                {stat.label}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-md-primary" dir="ltr">
                {stat.key}
              </p>
            </div>
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
          <div className="space-y-1">
            <label className={adminLabel}>العنوان الظاهر *</label>
            <Input
              value={form.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className={adminInput}
              required
            />
          </div>

          <div className="space-y-1">
            <label className={adminLabel}>القيمة الظاهرة *</label>
            <Input
              value={form.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder='مثال: 500+ أو 4.9 ★'
              className={cn(adminInput, "dir-ltr text-start font-bold")}
              dir="ltr"
              required
            />
            <p className="text-xs text-on-surface-variant">
              يمكن استخدام + أو ★ أو فواصل للعرض على الصفحة الرئيسية
            </p>
          </div>

          <div className="space-y-1">
            <label className={adminLabel}>وصف مختصر</label>
            <Input
              value={form.hint}
              onChange={(e) => onChange({ hint: e.target.value })}
              className={adminInput}
            />
          </div>

          <div className="space-y-1">
            <label className={adminLabel}>ترتيب العرض</label>
            <Input
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(e) => onChange({ sort_order: e.target.value })}
              className={cn(adminInput, "dir-ltr text-start")}
              dir="ltr"
            />
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low/50 p-4">
            <AdminCheckbox
              id="stat-visible"
              label="ظاهر على صفحة الهبوط"
              checked={form.is_visible}
              onChange={(e) => onChange({ is_visible: e.target.checked })}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={saving}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
