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
import { dashboardApi } from "@/lib/api";
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

function GrantSessionsModal({ student, onClose, onGranted }) {
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    const n = parseInt(count, 10);
    if (!n || n < 1 || n > 200) {
      toast.error("أدخل عدداً بين 1 و 200");
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardApi.adminGrantSessions(student.id, n);
      toast.success(`تم منح ${res?.data?.granted || n} حصة بنجاح`);
      onGranted?.(res?.data);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "تعذر منح الحصص");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(adminModalOverlay, "z-[70]")} role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-sm p-6 shadow-2xl")}>
        <h3 className="mb-4 text-base font-bold text-auth-on-surface">
          منح حصص للطالب — {student.full_name}
        </h3>
        <div className="mb-4">
          <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="grant-sessions-count">
            عدد الحصص
          </label>
          <input
            id="grant-sessions-count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={adminInput}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={cn(adminBtnPrimary, "flex-1")}
            onClick={handleGrant}
            disabled={loading}
          >
            {loading ? "جارٍ المنح..." : "منح الحصص"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={loading}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Subscription history + grant-sessions panel for admin user detail.
 *
 * Props:
 *   user    — the user object (must be role=student)
 *   visible — whether this panel is shown
 */
export default function AdminUserSubscriptions({ user, visible }) {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGrant, setShowGrant] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  if (!visible) return null;
  if (user?.role !== "student") {
    return (
      <p className="py-4 text-center text-sm text-auth-on-surface-variant">
        الاشتراكات متاحة للطلاب فقط
      </p>
    );
  }

  const activeSub = (subs || []).find((s) => s.status === "active");

  return (
    <div className="space-y-4">
      {activeSub ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-center justify-between gap-3">
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
            <button
              type="button"
              className={cn(adminBtnPrimary, "shrink-0 py-2 text-xs")}
              onClick={() => setShowGrant(true)}
            >
              منح حصص
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-4">
          <p className="text-sm text-auth-on-surface-variant">لا يوجد اشتراك نشط</p>
          <button
            type="button"
            className={cn(adminBtnSecondary, "py-2 text-xs")}
            onClick={() => setShowGrant(true)}
          >
            منح حصص يدوياً
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-auth-on-surface-variant">جارٍ التحميل...</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (subs || []).length === 0 ? (
        <p className="py-4 text-center text-sm text-auth-on-surface-variant">لا توجد اشتراكات سابقة</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-auth-on-surface-variant">سجل الاشتراكات</p>
          <div className="divide-y divide-auth-outline-variant/20 rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low">
            {subs.map((sub) => (
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
      )}

      {showGrant ? (
        <GrantSessionsModal
          student={user}
          onClose={() => setShowGrant(false)}
          onGranted={load}
        />
      ) : null}
    </div>
  );
}
