"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminCardSolid,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminLabel,
  adminModalOverlay
} from "@/lib/admin-styles";
import { adminApi, dashboardApi } from "@/lib/api";
import { formatDateAr, formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_CLASSES = {
  active: "bg-success/15 text-success",
  expired: "bg-auth-surface-highest text-auth-on-surface-variant",
  frozen: "bg-accent-blue/15 text-accent-blue",
  cancelled: "bg-danger/15 text-danger"
};
const STATUS_LABELS = {
  active: "نشط",
  expired: "منتهي",
  frozen: "مجمّد",
  cancelled: "ملغي"
};

function SubBadge({ status }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", STATUS_CLASSES[status] || "bg-auth-surface-highest text-auth-on-surface-variant")}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Assign Subscription Modal ────────────────────────────────────────────────
function AssignSubModal({ student, onClose, onDone }) {
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState("");
  const [sessionsOverride, setSessionsOverride] = useState("");
  const [periodDays, setPeriodDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    adminApi.getPlans("status=active")
      .then((r) => setPlans(r?.data || []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!planId) { toast.error("اختر خطة أولاً"); return; }
    const days = parseInt(periodDays, 10);
    if (!days || days < 1) { toast.error("مدة الاشتراك غير صالحة"); return; }

    setLoading(true);
    try {
      await dashboardApi.adminAssignSubscription(student.id, {
        plan_id: planId,
        sessions_override: sessionsOverride !== "" ? parseInt(sessionsOverride, 10) : undefined,
        period_days: days
      });
      toast.success("تم تعيين الاشتراك بنجاح");
      onDone?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || "تعذر تعيين الاشتراك");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(adminModalOverlay, "z-[70]")} role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} aria-label="إغلاق" />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-sm p-6 shadow-2xl")}>
        <h3 className="mb-4 text-base font-bold text-auth-on-surface">
          تعيين اشتراك — {student.full_name}
        </h3>

        <div className="space-y-4">
          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="assign-plan">الخطة</label>
            {plansLoading ? (
              <p className="text-xs text-auth-on-surface-variant">جارٍ التحميل...</p>
            ) : (
              <select
                id="assign-plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className={cn(adminInput, "w-full")}
              >
                <option value="">— اختر خطة —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.sessions_per_month} حصة / شهر · {formatCurrencyEgp(p.price)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="assign-sessions">
              عدد الحصص (اختياري — افتراضي من الخطة)
            </label>
            <input
              id="assign-sessions"
              type="number"
              min={0}
              max={9999}
              placeholder="مثال: 10"
              value={sessionsOverride}
              onChange={(e) => setSessionsOverride(e.target.value)}
              className={adminInput}
            />
          </div>

          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="assign-days">مدة الاشتراك (بالأيام)</label>
            <input
              id="assign-days"
              type="number"
              min={1}
              max={3650}
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              className={adminInput}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" className={cn(adminBtnPrimary, "flex-1")} onClick={handleSubmit} disabled={loading}>
            {loading ? "جارٍ التعيين..." : "تعيين الاشتراك"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={loading}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modify Subscription Modal ────────────────────────────────────────────────
function ModifySubModal({ student, sub, onClose, onDone }) {
  const [sessionsRemaining, setSessionsRemaining] = useState(String(sub.sessions_remaining ?? ""));
  const [periodEnd, setPeriodEnd] = useState(
    sub.current_period_end ? sub.current_period_end.slice(0, 10) : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const changes = {};
    const s = parseInt(sessionsRemaining, 10);
    if (sessionsRemaining !== "" && (!Number.isInteger(s) || s < 0)) {
      toast.error("عدد الحصص غير صالح"); return;
    }
    if (sessionsRemaining !== "") changes.sessions_remaining = s;
    if (periodEnd) changes.current_period_end = new Date(periodEnd).toISOString();

    if (!Object.keys(changes).length) { toast.error("لا توجد تعديلات"); return; }

    setLoading(true);
    try {
      await dashboardApi.adminModifySubscription(student.id, sub.id, changes);
      toast.success("تم تحديث الاشتراك");
      onDone?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || "تعذر التحديث");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(adminModalOverlay, "z-[70]")} role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} aria-label="إغلاق" />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-sm p-6 shadow-2xl")}>
        <h3 className="mb-1 text-base font-bold text-auth-on-surface">تعديل الاشتراك</h3>
        <p className="mb-4 text-xs text-auth-on-surface-variant">
          {sub.subscription_plans?.name || "اشتراك"} · {student.full_name}
        </p>

        <div className="space-y-4">
          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="mod-sessions">الحصص المتبقية</label>
            <input
              id="mod-sessions"
              type="number"
              min={0}
              max={9999}
              value={sessionsRemaining}
              onChange={(e) => setSessionsRemaining(e.target.value)}
              className={adminInput}
            />
            <p className="mt-1 text-[11px] text-auth-on-surface-variant">الحالي: {sub.sessions_remaining}</p>
          </div>

          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="mod-expiry">تاريخ انتهاء الاشتراك</label>
            <input
              id="mod-expiry"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className={adminInput}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" className={cn(adminBtnPrimary, "flex-1")} onClick={handleSubmit} disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={loading}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ─── Grant Sessions Modal ─────────────────────────────────────────────────────
function GrantSessionsModal({ student, onClose, onGranted }) {
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    const n = parseInt(count, 10);
    if (!n || n < 1 || n > 200) { toast.error("أدخل عدداً بين 1 و 200"); return; }
    setLoading(true);
    try {
      const res = await dashboardApi.adminGrantSessions(student.id, n);
      toast.success(`تم منح ${res?.data?.granted || n} حصة بنجاح`);
      onGranted?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || "تعذر منح الحصص");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(adminModalOverlay, "z-[70]")} role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} aria-label="إغلاق" />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-sm p-6 shadow-2xl")}>
        <h3 className="mb-4 text-base font-bold text-auth-on-surface">منح حصص — {student.full_name}</h3>
        <div className="mb-4">
          <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="grant-count">عدد الحصص</label>
          <input
            id="grant-count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={adminInput}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" className={cn(adminBtnPrimary, "flex-1")} onClick={handleGrant} disabled={loading}>
            {loading ? "جارٍ المنح..." : "منح الحصص"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={loading}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminUserSubscriptions({ user, visible }) {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null); // "assign" | "grant" | "modify" | "cancel"
  const [targetSub, setTargetSub] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id || !visible) return;
    setLoading(true);
    setError("");
    try {
      const res = await dashboardApi.adminUserSubscriptions(user.id);
      setSubs(res?.data || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل الاشتراكات");
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, visible]);

  useEffect(() => { load(); }, [load]);

  if (!visible) return null;
  if (user?.role !== "student") {
    return <p className="py-4 text-center text-sm text-auth-on-surface-variant">الاشتراكات متاحة للطلاب فقط</p>;
  }

  const activeSub = (subs || []).find((s) => s.status === "active");
  const historySubs = (subs || []).filter((s) => s.status !== "active");

  const handleCancelConfirm = async (sub) => {
    setCancelling(sub.id);
    try {
      await dashboardApi.adminCancelSubscription(user.id, sub.id);
      toast.success("تم إلغاء الاشتراك");
      load();
    } catch (err) {
      toast.error(err.message || "تعذر إلغاء الاشتراك");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Active subscription */}
      {activeSub ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-auth-on-surface">
                {activeSub.subscription_plans?.name || "اشتراك نشط"}
              </p>
              <p className="mt-1 text-sm text-auth-on-surface-variant">
                {activeSub.sessions_remaining} حصة متبقية
                {activeSub.current_period_end
                  ? ` · ينتهي ${formatDateAr(activeSub.current_period_end)}`
                  : null}
              </p>
            </div>
            <SubBadge status="active" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(adminBtnPrimary, "py-1.5 text-xs")}
              onClick={() => { setTargetSub(activeSub); setModal("grant"); }}
            >
              منح حصص
            </button>
            <button
              type="button"
              className={cn(adminBtnSecondary, "py-1.5 text-xs")}
              onClick={() => { setTargetSub(activeSub); setModal("modify"); }}
            >
              تعديل
            </button>
            <button
              type="button"
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-bold text-danger transition-colors hover:bg-danger/15 disabled:opacity-50"
              disabled={cancelling === activeSub.id}
              onClick={() => handleCancelConfirm(activeSub)}
            >
              {cancelling === activeSub.id ? "جارٍ الإلغاء..." : "إلغاء الاشتراك"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-4">
          <p className="text-sm text-auth-on-surface-variant">لا يوجد اشتراك نشط</p>
          <button
            type="button"
            className={cn(adminBtnPrimary, "py-2 text-xs")}
            onClick={() => setModal("assign")}
          >
            تعيين اشتراك
          </button>
        </div>
      )}

      {/* Assign button even when active (to replace) */}
      {activeSub ? (
        <button
          type="button"
          className={cn(adminBtnSecondary, "w-full py-2 text-xs")}
          onClick={() => setModal("assign")}
        >
          استبدال بخطة أخرى
        </button>
      ) : null}

      {/* Subscription history */}
      {loading ? (
        <p className="py-4 text-center text-sm text-auth-on-surface-variant">جارٍ التحميل...</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : historySubs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-auth-on-surface-variant">سجل الاشتراكات</p>
          <div className="divide-y divide-auth-outline-variant/20 rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low">
            {historySubs.map((sub) => (
              <div key={sub.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-auth-on-surface">
                    {sub.subscription_plans?.name || "خطة غير معروفة"}
                  </p>
                  <p className="mt-0.5 text-xs text-auth-on-surface-variant">
                    {sub.sessions_remaining} حصة متبقية
                    {sub.subscription_plans?.price
                      ? ` · ${formatCurrencyEgp(sub.subscription_plans.price)}`
                      : null}
                  </p>
                  <p className="mt-0.5 text-xs text-auth-on-surface-variant">
                    {formatDateAr(sub.created_at)}
                    {sub.current_period_end ? ` ← ${formatDateAr(sub.current_period_end)}` : null}
                  </p>
                </div>
                <SubBadge status={sub.status} />
              </div>
            ))}
          </div>
        </div>
      ) : !activeSub && (subs || []).length === 0 ? (
        <p className="py-2 text-center text-sm text-auth-on-surface-variant">لا توجد اشتراكات سابقة</p>
      ) : null}

      {/* Modals */}
      {modal === "assign" ? (
        <AssignSubModal student={user} onClose={() => setModal(null)} onDone={load} />
      ) : null}

      {modal === "grant" && targetSub ? (
        <GrantSessionsModal student={user} onClose={() => setModal(null)} onGranted={load} />
      ) : null}

      {modal === "modify" && targetSub ? (
        <ModifySubModal student={user} sub={targetSub} onClose={() => setModal(null)} onDone={load} />
      ) : null}
    </div>
  );
}
