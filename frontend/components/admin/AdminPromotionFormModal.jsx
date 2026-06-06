"use client";

import Icon from "@/components/shared/Icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminLabel,
  adminModalOverlay
} from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "coupon", label: "كوبون" },
  { value: "bundle", label: "باقة" },
  { value: "early_bird", label: "طائر مبكر" },
  { value: "referral", label: "إحالة" }
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percent", label: "نسبة مئوية" },
  { value: "fixed", label: "مبلغ ثابت" },
  { value: "free_session", label: "حصة مجانية" }
];

const APPLIES_TO_OPTIONS = [
  { value: "per_session", label: "لكل جلسة" },
  { value: "subscription", label: "الاشتراك" },
  { value: "all", label: "الكل" }
];

export default function AdminPromotionFormModal({
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
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="promo-form-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-high p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-on-surface-variant">
              {editId ? "تعديل عرض" : "عرض جديد"}
            </p>
            <h2 id="promo-form-title" className="text-lg font-black text-on-surface">
              {editId ? "تحديث الكوبون أو الخصم" : "إنشاء كوبون أو خصم"}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={adminLabel}>كود العرض *</label>
              <Input
                value={form.code}
                onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
                placeholder="SUMMER25"
                className={cn(adminInput, "dir-ltr text-start font-bold uppercase")}
                dir="ltr"
                required
              />
            </div>
            <Select
              variant="dark"
              label="نوع العرض"
              value={form.type}
              onChange={(e) => onChange({ type: e.target.value })}
              options={TYPE_OPTIONS}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Select
              variant="dark"
              label="نوع الخصم"
              value={form.discount_type}
              onChange={(e) => onChange({ discount_type: e.target.value })}
              options={DISCOUNT_TYPE_OPTIONS}
            />
            <div className="space-y-1">
              <label className={adminLabel}>قيمة الخصم *</label>
              <Input
                type="number"
                min="0"
                max={form.discount_type === "percent" ? "100" : undefined}
                value={form.discount_value}
                onChange={(e) => onChange({ discount_value: e.target.value })}
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
                required
              />
            </div>
            <Select
              variant="dark"
              label="ينطبق على"
              value={form.applies_to}
              onChange={(e) => onChange({ applies_to: e.target.value })}
              options={APPLIES_TO_OPTIONS}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className={adminLabel}>الحد الأدنى للحصص</label>
              <Input
                type="number"
                min="1"
                value={form.min_sessions}
                onChange={(e) => onChange({ min_sessions: e.target.value })}
                placeholder="اختياري"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className={adminLabel}>حصص إضافية</label>
              <Input
                type="number"
                min="0"
                value={form.bonus_sessions}
                onChange={(e) => onChange({ bonus_sessions: e.target.value })}
                placeholder="اختياري"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className={adminLabel}>حد الاستخدام لكل مستخدم</label>
              <Input
                type="number"
                min="1"
                value={form.per_user_limit}
                onChange={(e) => onChange({ per_user_limit: e.target.value })}
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={adminLabel}>الحد الأقصى للاستخدام</label>
              <Input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => onChange({ max_uses: e.target.value })}
                placeholder="بدون حد"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
            </div>
            <DateTimePicker
              variant="dark"
              label="تاريخ الانتهاء (اختياري)"
              value={form.expires_at}
              onChange={(e) => onChange({ expires_at: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : editId ? "حفظ التغييرات" : "إنشاء العرض"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={saving}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
