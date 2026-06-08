"use client";

import { useState } from "react";
import { toast } from "sonner";
import AdminUserSubscriptions from "@/components/admin/AdminUserSubscriptions";
import StatusBadge from "@/components/admin/StatusBadge";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid, adminModalOverlay } from "@/lib/admin-styles";
import { formatDateAr } from "@/lib/format";
import { ROLE_LABELS_AR } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

const roleBadgeClass = {
  student: "bg-accent-blue/15 text-accent-blue",
  teacher: "bg-peak-orange/15 text-peak-orange",
  parent: "bg-secondary-container/30 text-secondary",
  admin: "bg-primary-container/20 text-md-primary"
};

const GRADE_LABELS = {
  first_prep: "أول إعدادي",
  second_prep: "ثاني إعدادي",
  third_prep: "ثالث إعدادي",
  first: "أول ثانوي",
  second: "ثاني ثانوي",
  third: "ثالث ثانوي"
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
      <dt className="shrink-0 text-auth-on-surface-variant">{label}</dt>
      <dd className={cn("truncate font-bold text-auth-on-surface", ltr && "text-start")} dir={ltr ? "ltr" : undefined}>
        {children || "—"}
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

const TABS = [
  { id: "info", label: "المعلومات" },
  { id: "profile", label: "الملف" },
  { id: "subscriptions", label: "الاشتراكات" }
];

/**
 * Full-detail modal for a user.
 *
 * Props:
 *   user            — user object from the table row (basic fields)
 *   detail          — { user, profile } fetched from GET /admin/users/:id (or null while loading)
 *   busy            — pending mutation
 *   currentUserId
 *   onClose()
 *   onVerify(user)
 *   onSuspendToggle(user)
 *   onEdit(user)    — open edit modal
 */
export default function AdminUserDetailsModal({
  user,
  detail,
  busy = false,
  currentUserId = "",
  onClose,
  onVerify,
  onSuspendToggle,
  onEdit
}) {
  const [tab, setTab] = useState("info");
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const isSuspended = user.is_active === false;
  const canVerify = user.role === "teacher" && user.is_verified !== true;
  const modifiable = canModifyUser(user, currentUserId);
  const isSelf = user.id === currentUserId;
  const profile = detail?.profile || null;

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

  const visibleTabs = user.role === "student"
    ? TABS
    : TABS.filter((t) => t.id !== "subscriptions");

  return (
    <div className={cn(adminModalOverlay)} role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 flex w-full max-w-lg flex-col p-0 shadow-2xl")}>
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-auth-outline-variant/20 p-5">
          <UserAvatar user={user} />
          <div className="min-w-0 flex-1">
            <h2 id="user-detail-title" className="truncate text-base font-bold text-auth-on-surface">
              {user.full_name || "—"}
            </h2>
            <button
              type="button"
              onClick={copyEmail}
              className="mt-0.5 flex max-w-full items-center gap-1 truncate text-sm text-auth-on-surface-variant transition-colors hover:text-peak-orange"
              dir="ltr"
              title="نسخ البريد"
            >
              <span className="truncate">{user.email || "—"}</span>
              <span className="shrink-0 text-[10px] font-bold">{copied ? "✓" : "نسخ"}</span>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", roleBadgeClass[user.role] || "bg-auth-surface-highest text-auth-on-surface-variant")}>
                {ROLE_LABELS_AR[user.role] || user.role || "—"}
              </span>
              <StatusBadge status={isSuspended ? "suspended" : "active"} />
              {user.role === "teacher" ? (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", user.is_verified ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                  {user.is_verified ? "موثّق" : "غير موثّق"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-auth-outline-variant/20">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-bold transition-colors",
                tab === t.id
                  ? "border-b-2 border-peak-orange text-peak-orange"
                  : "text-auth-on-surface-variant hover:text-auth-on-surface"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-h-72 overflow-y-auto p-5">
          {tab === "info" ? (
            <dl className="space-y-3 text-sm">
              <DetailRow label="البريد الإلكتروني" ltr>{user.email}</DetailRow>
              <DetailRow label="تاريخ التسجيل">{formatDateAr(user.created_at)}</DetailRow>
              {user.phone ? <DetailRow label="الهاتف" ltr>{user.phone}</DetailRow> : null}
              {isSelf ? (
                <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                  هذا حسابك — لا يمكن تعليقه من هنا.
                </p>
              ) : user.role === "admin" ? (
                <p className="mt-2 rounded-lg bg-auth-surface-highest px-3 py-2 text-xs font-semibold text-auth-on-surface-variant">
                  حساب مشرف — محمي من التعليق.
                </p>
              ) : null}
            </dl>
          ) : tab === "profile" ? (
            <dl className="space-y-3 text-sm">
              {user.role === "student" && profile ? (
                <>
                  <DetailRow label="الصف">{GRADE_LABELS[profile.grade] || profile.grade}</DetailRow>
                  {profile.section ? <DetailRow label="الشعبة">{profile.section}</DetailRow> : null}
                  {profile.link_code ? <DetailRow label="كود الربط" ltr>{profile.link_code}</DetailRow> : null}
                  {profile.streak_days ? <DetailRow label="أيام التسلسل">{profile.streak_days} يوم</DetailRow> : null}
                </>
              ) : user.role === "teacher" && profile ? (
                <>
                  {profile.bio ? <DetailRow label="نبذة">{profile.bio}</DetailRow> : null}
                  {profile.subjects?.length ? (
                    <DetailRow label="المواد">{profile.subjects.join("، ")}</DetailRow>
                  ) : null}
                  {profile.rating ? <DetailRow label="التقييم">{Number(profile.rating).toFixed(1)} / 5</DetailRow> : null}
                  {profile.experience_years ? <DetailRow label="سنوات الخبرة">{profile.experience_years}</DetailRow> : null}
                  {profile.commission_rate != null ? (
                    <DetailRow label="نسبة العمولة">{profile.commission_rate}%</DetailRow>
                  ) : null}
                </>
              ) : user.role === "parent" && profile?.children?.length ? (
                <div>
                  <p className="mb-2 text-xs font-bold text-auth-on-surface-variant">الأبناء المرتبطون</p>
                  <ul className="space-y-1">
                    {profile.children.map((c) => (
                      <li key={c.user_id} className="flex items-center justify-between rounded-lg bg-auth-surface-low px-3 py-2 text-xs">
                        <span className="font-bold text-auth-on-surface">{GRADE_LABELS[c.grade] || c.grade || "—"}</span>
                        <span className="text-auth-on-surface-variant" dir="ltr">{c.link_code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-auth-on-surface-variant">لا توجد بيانات إضافية</p>
              )}
            </dl>
          ) : tab === "subscriptions" ? (
            <AdminUserSubscriptions user={user} visible={tab === "subscriptions"} />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-auth-outline-variant/20 p-4">
          {modifiable && onEdit ? (
            <button
              type="button"
              className={cn(adminBtnSecondary, "flex-1 text-xs")}
              onClick={() => onEdit?.(user)}
              disabled={busy}
            >
              تعديل البيانات
            </button>
          ) : null}
          {canVerify ? (
            <button
              type="button"
              className={cn(adminBtnPrimary, "flex-1 bg-accent-blue text-xs hover:brightness-110")}
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
                "flex-1 text-xs text-white",
                isSuspended ? "bg-success hover:brightness-110" : "bg-danger hover:brightness-110"
              )}
              disabled={busy}
              onClick={() => onSuspendToggle?.(user)}
            >
              {busy ? "جاري..." : isSuspended ? "تفعيل الحساب" : "تعليق الحساب"}
            </button>
          ) : null}
          <button type="button" className={cn(adminBtnSecondary, "text-xs")} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
