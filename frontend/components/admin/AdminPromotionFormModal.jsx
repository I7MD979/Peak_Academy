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
  { value: "coupon", label: "كوبون — خصم عام بكود" },
  { value: "bundle", label: "باقة — حصص إضافية أو خصم على باقة" },
  { value: "early_bird", label: "طائر مبكر — عرض محدود بوقت" },
  { value: "referral", label: "إحالة — كود مرتبط ببرنامج الإحالة" }
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percent", label: "نسبة مئوية (%)" },
  { value: "fixed", label: "مبلغ ثابت (جنيه)" },
  { value: "free_session", label: "حصة مجانية (خصم كامل)" }
];

const APPLIES_TO_OPTIONS = [
  { value: "per_session", label: "حصة منفردة — عند دفع جلسة واحدة" },
  { value: "subscription", label: "اشتراك شهري — عند شراء باقة" },
  { value: "all", label: "الكل — حصص واشتراكات" }
];

const FIELD_HINTS = {
  code: "الكود الذي يدخله الطالب (أحرف إنجليزية وأرقام). لا يُعرض تلقائياً على الصفحة الرئيسية.",
  type: "كوبون: خصم عام. باقة: مزايا إضافية. طائر مبكر: ينتهي بتاريخ. إحالة: يُربط بكود إحالة موجود.",
  discount_type: "نسبة: من السعر. ثابت: مبلغ بالجنيه. حصة مجانية: يصفر سعر الحصة/الباقة.",
  discount_value: "للنسبة: 1–100. للثابت: بالجنيه. للحصة المجانية: اترك 0.",
  applies_to: "حدّد أين يُقبل الكود: دفع حصة، اشتراك، أو كلاهما.",
  min_sessions: "لنوع «باقة» فقط: أقل عدد حصص ليُفعَّل العرض.",
  bonus_sessions: "حصص مجانية إضافية تُمنح مع الاشتراك (اختياري).",
  per_user_limit: "كم مرة يمكن لنفس المستخدم استخدام هذا الكود.",
  max_uses: "إجمالي مرات استخدام الكود على المنصة (اتركه فارغاً = بلا حد).",
  expires_at: "بعد هذا التاريخ لا يُقبل الكود حتى لو كان نشطاً."
};

function FieldHint({ children }) {
  if (!children) return null;
  return <p className="text-xs leading-relaxed text-on-surface-variant">{children}</p>;
}

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
              {editId ? "تحديث كود الخصم" : "إنشاء كود خصم"}
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              الأكواد تُتحقَّق عند الدفع داخل المنصة — لا تُطبع على الصفحة الرئيسية.
            </p>
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
              <label className={adminLabel}>كود الخصم *</label>
              <Input
                value={form.code}
                onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
                placeholder="SUMMER25"
                className={cn(adminInput, "dir-ltr text-start font-bold uppercase")}
                dir="ltr"
                required
              />
              <FieldHint>{FIELD_HINTS.code}</FieldHint>
            </div>
            <div className="space-y-1">
              <Select
                variant="dark"
                label="تصنيف العرض"
                value={form.type}
                onChange={(e) => onChange({ type: e.target.value })}
                options={TYPE_OPTIONS}
              />
              <FieldHint>{FIELD_HINTS.type}</FieldHint>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Select
                variant="dark"
                label="آلية الخصم"
                value={form.discount_type}
                onChange={(e) => onChange({ discount_type: e.target.value })}
                options={DISCOUNT_TYPE_OPTIONS}
              />
              <FieldHint>{FIELD_HINTS.discount_type}</FieldHint>
            </div>
            <div className="space-y-1">
              <label className={adminLabel}>
                قيمة الخصم *
                {form.discount_type === "percent"
                  ? " (%)"
                  : form.discount_type === "fixed"
                    ? " (جنيه)"
                    : ""}
              </label>
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
              <FieldHint>{FIELD_HINTS.discount_value}</FieldHint>
            </div>
            <div className="space-y-1">
              <Select
                variant="dark"
                label="يُطبَّق على"
                value={form.applies_to}
                onChange={(e) => onChange({ applies_to: e.target.value })}
                options={APPLIES_TO_OPTIONS}
              />
              <FieldHint>{FIELD_HINTS.applies_to}</FieldHint>
            </div>
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
              <FieldHint>{FIELD_HINTS.min_sessions}</FieldHint>
            </div>
            <div className="space-y-1">
              <label className={adminLabel}>حصص إضافية مجانية</label>
              <Input
                type="number"
                min="0"
                value={form.bonus_sessions}
                onChange={(e) => onChange({ bonus_sessions: e.target.value })}
                placeholder="اختياري"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
              <FieldHint>{FIELD_HINTS.bonus_sessions}</FieldHint>
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
              <FieldHint>{FIELD_HINTS.per_user_limit}</FieldHint>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={adminLabel}>الحد الأقصى للاستخدام (كل المنصة)</label>
              <Input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => onChange({ max_uses: e.target.value })}
                placeholder="بدون حد"
                className={cn(adminInput, "dir-ltr text-start")}
                dir="ltr"
              />
              <FieldHint>{FIELD_HINTS.max_uses}</FieldHint>
            </div>
            <div className="space-y-1">
              <DateTimePicker
                variant="dark"
                label="تاريخ انتهاء الصلاحية"
                value={form.expires_at}
                onChange={(e) => onChange({ expires_at: e.target.value })}
              />
              <FieldHint>{FIELD_HINTS.expires_at}</FieldHint>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : editId ? "حفظ التغييرات" : "إنشاء الكود"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={saving}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
