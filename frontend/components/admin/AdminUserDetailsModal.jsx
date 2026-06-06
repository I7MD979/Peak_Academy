"use client";

import { useState } from "react";
import { toast } from "sonner";
import StatusBadge from "@/components/admin/StatusBadge";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid } from "@/lib/admin-styles";
import { formatDateAr } from "@/lib/format";
import { ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

const roleBadgeClass = {
  student: "bg-accent-blue/15 text-accent-blue",
  teacher: "bg-peak-orange/15 text-peak-orange",
  parent: "bg-secondary-container/30 text-secondary",
  admin: "bg-primary-container/20 text-md-primary"
};

function UserAvatar({ user }) {
  const initial = (user?.full_name || "?").trim().slice(0, 1);
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-peak-orange/15 text-xl font-black text-peak-orange">
      {user?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

function DetailRow({ label, children, ltr = false }) {
  return (
    <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
      <dt className="text-auth-on-surface-variant">{label}</dt>
      <dd className={cn("font-bold text-auth-on-surface", ltr && "text-start")} dir={ltr ? "ltr" : undefined}>
        {children}
      </dd>
    </div>
  );
}

function canModifyUser(user, currentUserId) {
  if (!user) return false;
  if (user.id === currentUserId) return false;
  if (user.role === "admin") return false;
  return true;
}

export default function AdminUserDetailsModal({
  user,
  busy = false,
  currentUserId = "",
  onClose,
  onVerify,
  onSuspendToggle
}) {
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const isSuspended = user.is_active === false;
  const canVerify = user.role === "teacher" && user.is_verified !== true;
  const modifiable = canModifyUser(user, currentUserId);
  const isSelf = user.id === currentUserId;

  const copyEmail = async () => {
    if (!user.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      toast.success("تم نسخ البريد");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-lg p-6 shadow-2xl")}>
        <div className="mb-5 flex items-start gap-4">
          <UserAvatar user={user} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-auth-on-surface">{user.full_name || "—"}</h2>
            <button
              type="button"
              onClick={copyEmail}
              className="mt-1 flex max-w-full items-center gap-1 truncate text-sm text-auth-on-surface-variant transition-colors hover:text-peak-orange"
              dir="ltr"
              title="نسخ البريد"
            >
              <span className="truncate">{user.email || "—"}</span>
              <span className="shrink-0 text-[10px] font-bold">{copied ? "✓" : "نسخ"}</span>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold",
                  roleBadgeClass[user.role] || "bg-auth-surface-highest text-auth-on-surface-variant"
                )}
              >
                {ROLE_LABELS_AR[user.role] || user.role || "—"}
              </span>
              <StatusBadge status={isSuspended ? "suspended" : "active"} />
              {user.role === "teacher" ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    user.is_verified ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  )}
                >
                  {user.is_verified ? "موثّق" : "غير موثّق"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <DetailRow label="تاريخ التسجيل">{formatDateAr(user.created_at)}</DetailRow>
          {user.phone ? (
            <DetailRow label="الهاتف" ltr>
              {user.phone}
            </DetailRow>
          ) : null}
          {user.school_level ? (
            <DetailRow label="المرحلة">{user.school_level === "prep" ? "إعدادي" : "ثانوي"}</DetailRow>
          ) : null}
          {user.grade_label ? <DetailRow label="الصف">{user.grade_label}</DetailRow> : null}
        </dl>

        {isSelf ? (
          <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
            هذا حسابك الحالي — لا يمكن تعليقه أو تعديل صلاحياته من هنا.
          </p>
        ) : user.role === "admin" ? (
          <p className="mt-4 rounded-lg bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface-variant">
            حساب مشرف — محمي من التعليق عبر لوحة الإدارة.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {canVerify ? (
            <button
              type="button"
              className={cn(adminBtnPrimary, "flex-1 bg-accent-blue hover:brightness-110")}
              disabled={busy}
              onClick={() => onVerify?.(user)}
            >
              {busy ? "جاري..." : "توثيق المدرس"}
            </button>
          ) : null}
          {modifiable ? (
            <button
              type="button"
              className={cn(
                adminBtnPrimary,
                "flex-1 text-white",
                isSuspended ? "bg-success hover:brightness-110" : "bg-danger hover:brightness-110"
              )}
              disabled={busy}
              onClick={() => onSuspendToggle?.(user)}
            >
              {busy ? "جاري..." : isSuspended ? "تفعيل الحساب" : "تعليق الحساب"}
            </button>
          ) : null}
          <button type="button" className={cn(adminBtnSecondary, "flex-1 sm:flex-none")} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
