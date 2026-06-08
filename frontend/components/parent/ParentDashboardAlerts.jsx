"use client";

export default function ParentDashboardAlerts({ alerts = [] }) {
  if (alerts.length > 0) {
    return (
      <section className="rounded-2xl border border-warning/35 bg-warning/10 p-4 md:p-5">
        <h3 className="font-black text-warning">تنبيهات تحتاج متابعة</h3>
        <ul className="mt-2 space-y-1 text-sm text-auth-on-surface">
          {alerts.map((alert) => (
            <li key={alert.id ?? alert.message}>• {alert.message}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-success/35 bg-success/10 p-4 md:p-5">
      <p className="text-sm font-semibold text-success">
        أداء جيد — لا توجد مواد تحتاج تنبيه عاجلاً هذا الأسبوع.
      </p>
    </section>
  );
}
