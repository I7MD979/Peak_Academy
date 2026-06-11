"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRequest, clearApiCache } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

/**
 * Hook for study room subscription & free trial state.
 *
 * Returns:
 *  - subscription    : the student_subscriptions row (or null)
 *  - trialStatus     : 'none' | 'trialing' | 'trial_expired' | 'active' | 'unknown'
 *  - hasAccess       : true if user can enter study rooms right now
 *  - daysRemaining   : integer days left in trial/subscription (null if not applicable)
 *  - loading         : initial fetch in progress
 *  - error           : last error message (string | null)
 *  - activateTrial() : start the 30-day free trial
 *  - refresh()       : re-fetch subscription data
 */
export function useSubscription() {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Reuse the existing /api/subscriptions/me endpoint which returns
      // { subscription, paid_session_count, ... }
      const res = await apiRequest("/subscriptions/me");
      setSubscription(res?.data?.subscription ?? null);
    } catch (err) {
      setError(err?.message || "تعذر تحميل بيانات الاشتراك");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const activateTrial = async () => {
    const res = await apiRequest("/subscriptions/activate-trial", { method: "POST" });
    clearApiCache();
    const data = res?.data;
    if (data?.trial_end) {
      setSubscription((prev) => ({
        ...(prev || {}),
        status: "trialing",
        trial_start: new Date().toISOString(),
        trial_end: data.trial_end,
        current_period_end: data.trial_end
      }));
    }
    await fetchSubscription();
    return data;
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const status = subscription?.status ?? null;

  const daysRemaining = (() => {
    const endDate =
      status === "trialing" ? subscription?.trial_end : subscription?.current_period_end;
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate) - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  })();

  const hasAccess =
    (status === "trialing" && (daysRemaining ?? 0) > 0) ||
    (status === "active" && (daysRemaining ?? 0) > 0);

  const trialStatus = (() => {
    if (!status) return "none";
    if (status === "trialing") return "trialing";
    if (status === "trial_expired") return "trial_expired";
    if (status === "active") return "active";
    return "none";
  })();

  return {
    subscription,
    trialStatus,
    hasAccess,
    daysRemaining,
    loading,
    error,
    activateTrial,
    refresh: fetchSubscription
  };
}
