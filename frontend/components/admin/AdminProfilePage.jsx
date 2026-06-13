import AdminStatCard from "@/components/admin/AdminStatCard";
import Icon from "@/components/shared/Icon";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid, adminErrorBox } from "@/lib/admin-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AdminProfileStatsGrid({ stats, loading, error, onRetry }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-on-surface-variant">نظرة سريعة على المنصة</h2>
        {error ? (
          <button type="button" onClick={onRetry} className="text-xs font-bold text-md-primary hover:underline">
            إعادة تحميل الإحصائيات
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon="groups"
          label="إجمالي المستخدمين"
          value={stats?.total_users ?? 0}
          sub={error ? "تعذّر التحميل" : "مسجّلون على المنصة"}
          tone="blue"
          href="/admin/users"
          loading={loading}
        />
        <AdminStatCard
          icon="sensors"
          label="جلسات مباشرة"
          value={stats?.live_sessions ?? 0}
          sub="الآن"
          tone="accent"
          href="/admin/sessions"
          loading={loading}
        />
        <AdminStatCard
          icon="payments"
          label="طلبات سحب معلّقة"
          value={stats?.pending_withdrawals ?? 0}
          tone="warning"
          href="/admin/withdrawals"
          loading={loading}
        />
        <AdminStatCard
          icon="account_balance_wallet"
          label="إيرادات المنصة"
          value={formatCurrencyEgp(stats?.total_revenue ?? 0)}
          tone="success"
          href="/admin/reports"
          loading={loading}
        />
      </div>
    </section>
  );
}

export function AdminProfileAccountSummary({ profile, roleLabel, joinDateLabel }) {
  return (
    <section className={cn(adminCardSolid, "p-5")}>
      <h3 className="text-lg font-black text-on-surface">ملخص الحساب</h3>
      <dl className="mt-4 divide-y divide-outline-variant text-sm">
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-on-surface-variant">الدور</dt>
          <dd className="font-bold text-on-surface">{roleLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-on-surface-variant">البريد</dt>
          <dd className="max-w-[58%] truncate font-bold text-on-surface" dir="ltr">
            {profile.email || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-on-surface-variant">حالة الحساب</dt>
          <dd className={cn("font-bold", profile.is_active !== false ? "text-success" : "text-error")}>
            {profile.is_active !== false ? "نشط" : "موقوف"}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-on-surface-variant">التحقق</dt>
          <dd className="font-bold text-on-surface">{profile.is_verified ? "موثّق" : "قيد التحقق"}</dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-on-surface-variant">تاريخ الانضمام</dt>
          <dd className="font-bold text-on-surface">{joinDateLabel}</dd>
        </div>
      </dl>
    </section>
  );
}

export function AdminProfileQuickLinks({ links = [] }) {
  return (
    <section className={cn(adminCardSolid, "p-5")}>
      <h3 className="text-sm font-bold text-on-surface">اختصارات سريعة</h3>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:border-md-primary/40 hover:bg-surface-container-high"
          >
            <Icon name={link.icon} size={16} className="text-md-primary" />
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export function AdminProfileLoadingState() {
  return (
    <div className={cn(adminCardSolid, "flex min-h-[40vh] items-center justify-center p-8")}>
      <SectionLoader message="جاري تحميل الملف الشخصي..." />
    </div>
  );
}

export function AdminProfileFallbackBanner() {
  return (
    <div
      className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm"
      role="status"
    >
      <Icon name="bell" size={20} className="mt-0.5 shrink-0 text-warning" />
      <div>
        <p className="font-bold text-warning">عرض مؤقت للبيانات</p>
        <p className="mt-1 leading-relaxed text-on-surface-variant">
          تعذّر مزامنة الملف من الخادم. تأكد أن الخادم يعمل ثم اضغط «تحديث البيانات».
        </p>
      </div>
    </div>
  );
}

export function AdminProfileErrorBanner({ message, onRetry }) {
  return (
    <div className={adminErrorBox}>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className={cn(adminBtnSecondary, "mt-3")} onClick={onRetry}>
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}

export function AdminProfileSaveBar({ saving, onCancel }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 rounded-xl border border-outline-variant bg-surface-container-high/95 p-3 shadow-lg backdrop-blur-md">
      <button type="submit" className={adminBtnPrimary} disabled={saving}>
        {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
      </button>
      <button type="button" className={adminBtnSecondary} disabled={saving} onClick={onCancel}>
        إلغاء التعديلات
      </button>
    </div>
  );
}
