"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminProfileView from "@/components/admin/AdminProfileView";
import { useAccountProfile } from "@/hooks/useAccountProfile";
import { dashboardApi } from "@/lib/api";
import { formatJoinDateAr, ROLE_LABELS_AR } from "@/lib/profile-form";

const QUICK_LINKS = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: "dashboard" },
  { href: "/admin/users", label: "المستخدمون", icon: "users" },
  { href: "/admin/sessions", label: "الجلسات", icon: "video" },
  { href: "/admin/withdrawals", label: "طلبات السحب", icon: "creditCard" },
  { href: "/admin/reports", label: "التقارير", icon: "barChart" },
  { href: "/admin/landing", label: "صفحة الهبوط", icon: "globe" }
];

export default function AdminProfileRoute() {
  const {
    profile,
    form,
    fieldErrors,
    loading,
    saving,
    error,
    isAuthFallback,
    loadProfile,
    handleChange,
    resetFormFromProfile,
    saveProfile
  } = useAccountProfile();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await dashboardApi.adminStats();
      setStats(res?.data || null);
    } catch {
      setStats(null);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadStats()]);
  }, [loadProfile, loadStats]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const ok = await saveProfile();
    if (ok) await loadStats();
  };

  const displayName = form.full_name || profile?.full_name || "حسابي";
  const displayAvatar = form.avatar_url || profile?.avatar_url;

  const menuItems = useMemo(
    () => [
      { label: "تحديث البيانات", icon: "refresh", onClick: refreshAll, disabled: loading || saving },
      { label: "إلغاء التعديلات", icon: "close", onClick: resetFormFromProfile, disabled: saving },
      { label: "معاينة الموقع", icon: "globe", onClick: () => window.open("/", "_blank", "noopener,noreferrer") }
    ],
    [refreshAll, resetFormFromProfile, loading, saving]
  );

  return (
    <AdminProfileView
      profile={profile}
      form={form}
      fieldErrors={fieldErrors}
      stats={stats}
      statsLoading={statsLoading}
      statsError={statsError}
      loading={loading}
      saving={saving}
      error={error}
      isAuthFallback={isAuthFallback}
      displayName={displayName}
      displayAvatar={displayAvatar}
      quickLinks={QUICK_LINKS}
      roleLabel={ROLE_LABELS_AR.admin}
      joinDateLabel={formatJoinDateAr(profile?.created_at)}
      menuItems={menuItems}
      onRefresh={refreshAll}
      onLoadStats={loadStats}
      onChange={handleChange}
      onSubmit={onSubmit}
      onReset={resetFormFromProfile}
    />
  );
}
