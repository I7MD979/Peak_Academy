"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardApi } from "@/lib/api";
import { PERMISSION_GROUPS } from "@/lib/admin-permissions";
import AdminPageHeader from "./AdminPageHeader";
import AdminConfirmDialog from "./AdminConfirmDialog";
import Icon from "@/components/shared/Icon";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import {
  adminPage,
  adminCardSolid,
  adminInput,
  adminBtnPrimary,
  adminBtnSecondary,
  adminSectionTitle,
  adminMuted,
  adminLabel,
  adminErrorBox,
  adminModalOverlay
} from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

// ── Permission checkboxes modal ──────────────────────────────────────────────

function PermissionsModal({ user, onClose, onSave }) {
  const [selected, setSelected] = useState(() => new Set(user?.permissions || []));
  const [saving, setSaving] = useState(false);

  const toggle = (perm) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });

  const toggleGroup = (group) => {
    const keys = group.permissions.map((p) => p.key);
    const allOn = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave([...selected]);
    setSaving(false);
  };

  return (
    <div className={adminModalOverlay}>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-lg shadow-2xl")}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-auth-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-auth-on-surface">صلاحيات المشرف</h2>
            <p className={cn(adminMuted, "text-sm")}>{user?.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-auth-on-surface-variant transition-colors hover:bg-auth-surface-highest"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Permissions list */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.permissions.map((p) => p.key);
            const allOn = keys.every((k) => selected.has(k));

            return (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(adminLabel, "text-xs font-bold uppercase tracking-wider")}>
                    {group.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="text-xs text-peak-orange hover:underline"
                  >
                    {allOn ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                </div>
                <div className="rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low divide-y divide-auth-outline-variant/20">
                  {group.permissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-auth-surface-highest"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(perm.key)}
                        onChange={() => toggle(perm.key)}
                        className="h-4 w-4 rounded border-auth-outline-variant accent-peak-orange"
                      />
                      <span className="text-sm text-auth-on-surface">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-auth-outline-variant/30 px-6 py-4">
          <button type="button" className={adminBtnSecondary} onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button type="button" className={adminBtnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add supervisor modal ─────────────────────────────────────────────────────

const ROLE_LABEL = {
  student: "طالب",
  teacher: "معلم",
  parent: "ولي أمر",
  admin: "مدير",
  supervisor: "مشرف"
};

function AddSupervisorModal({ onClose, onAdded }) {
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [err, setErr] = useState("");

  const search = async () => {
    const q = email.trim();
    if (!q) return;
    setSearching(true);
    setFound(null);
    setNotFound(false);
    setErr("");
    try {
      const res = await dashboardApi.adminUsers(`search=${encodeURIComponent(q)}&limit=5`);
      const users = res?.data || [];
      const match = users.find((u) => u.email?.toLowerCase() === q.toLowerCase());
      if (match) setFound(match);
      else setNotFound(true);
    } catch (e) {
      setErr(e?.message || "تعذر البحث");
    } finally {
      setSearching(false);
    }
  };

  const promote = async () => {
    if (!found) return;
    setPromoting(true);
    setErr("");
    try {
      await dashboardApi.updateStaffRole(found.id, { role: "supervisor" });
      onAdded(found);
    } catch (e) {
      setErr(e?.message || "تعذر ترقية المستخدم");
      setPromoting(false);
    }
  };

  return (
    <div className={adminModalOverlay}>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-md shadow-2xl")}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-auth-outline-variant/30 px-6 py-4">
          <h2 className="text-lg font-bold text-auth-on-surface">إضافة مشرف جديد</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-auth-on-surface-variant transition-colors hover:bg-auth-surface-highest"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={cn(adminLabel, "mb-2 block")}>البريد الإلكتروني للمستخدم</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="user@example.com"
                className={cn(adminInput, "flex-1")}
                dir="ltr"
              />
              <button
                type="button"
                className={adminBtnPrimary}
                onClick={search}
                disabled={searching || !email.trim()}
              >
                {searching ? "..." : "بحث"}
              </button>
            </div>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}

          {notFound && (
            <div className="rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-4 text-center text-sm text-auth-on-surface-variant">
              لم يُعثر على مستخدم بهذا البريد الإلكتروني
            </div>
          )}

          {found && (
            <div className="rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peak-orange/20 font-bold text-peak-orange">
                  {found.full_name?.[0] || "م"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-auth-on-surface">{found.full_name}</div>
                  <div className="truncate text-sm text-auth-on-surface-variant" dir="ltr">
                    {found.email}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                    found.role === "admin"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : found.role === "supervisor"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-auth-surface-highest text-auth-on-surface-variant"
                  )}
                >
                  {ROLE_LABEL[found.role] || found.role}
                </span>
              </div>

              {found.role === "admin" && (
                <p className="text-sm text-yellow-400">هذا المستخدم مدير نظام بالفعل</p>
              )}
              {found.role === "supervisor" && (
                <p className="text-sm text-blue-400">هذا المستخدم مشرف بالفعل</p>
              )}
              {found.role !== "admin" && found.role !== "supervisor" && (
                <button
                  type="button"
                  className={cn(adminBtnPrimary, "w-full")}
                  onClick={promote}
                  disabled={promoting}
                >
                  {promoting ? "جاري الترقية..." : "ترقية إلى مشرف"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Staff row ────────────────────────────────────────────────────────────────

function StaffRow({ user, onEdit, onDemote }) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peak-orange/20 font-bold text-peak-orange">
        {user.full_name?.[0] || "م"}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-auth-on-surface">{user.full_name}</div>
        <div className="truncate text-sm text-auth-on-surface-variant" dir="ltr">
          {user.email}
        </div>
      </div>

      {/* Role + actions */}
      <div className="flex shrink-0 items-center gap-2">
        {user.role === "admin" ? (
          <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-400">
            مدير النظام
          </span>
        ) : (
          <>
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400">
              مشرف
            </span>
            <span className="text-xs text-auth-on-surface-variant">
              {user.permissions?.length || 0} صلاحية
            </span>
            <button
              type="button"
              onClick={() => onEdit(user)}
              className={cn(adminBtnSecondary, "gap-1.5 px-3 py-1.5 text-xs")}
            >
              <Icon name="shield" size={13} />
              الصلاحيات
            </button>
            <button
              type="button"
              onClick={() => onDemote(user)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
            >
              إزالة
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminPermissionsPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [demoteUser, setDemoteUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const pushToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setFetchErr("");
    try {
      const res = await dashboardApi.getStaff();
      setStaff(res?.data || []);
    } catch (e) {
      setFetchErr(e?.message || "تعذر تحميل قائمة الموظفين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleSavePermissions = async (permissions) => {
    if (!editUser) return;
    setActionLoading(true);
    try {
      await dashboardApi.updateStaffPermissions(editUser.id, permissions);
      setStaff((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, permissions } : u))
      );
      setEditUser(null);
      pushToast("تم تحديث الصلاحيات بنجاح");
    } catch (e) {
      pushToast(e?.message || "تعذر تحديث الصلاحيات", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemote = async () => {
    if (!demoteUser) return;
    setActionLoading(true);
    try {
      await dashboardApi.updateStaffRole(demoteUser.id, { role: "student" });
      setStaff((prev) => prev.filter((u) => u.id !== demoteUser.id));
      setDemoteUser(null);
      pushToast("تم إزالة صلاحيات المشرف");
    } catch (e) {
      pushToast(e?.message || "تعذر إزالة المشرف", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdded = (user) => {
    setShowAddModal(false);
    loadStaff();
    pushToast(`تم ترقية ${user.full_name} إلى مشرف`);
  };

  const admins = staff.filter((u) => u.role === "admin");
  const supervisors = staff.filter((u) => u.role === "supervisor");

  return (
    <div className={cn(adminPage, "p-6 space-y-6")}>
      <AdminPageHeader
        title="إدارة الصلاحيات"
        subtitle="تحكم في أدوار المشرفين وصلاحياتهم على لوحة الإدارة"
        actions={[
          {
            label: "إضافة مشرف",
            icon: "plus",
            onClick: () => setShowAddModal(true)
          }
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className={cn(adminCardSolid, "p-5")}>
          <div className="text-3xl font-black text-peak-orange">{staff.length}</div>
          <div className={cn(adminMuted, "mt-1 text-sm")}>إجمالي الفريق</div>
        </div>
        <div className={cn(adminCardSolid, "p-5")}>
          <div className="text-3xl font-black text-yellow-400">{admins.length}</div>
          <div className={cn(adminMuted, "mt-1 text-sm")}>مدير النظام</div>
        </div>
        <div className={cn(adminCardSolid, "p-5")}>
          <div className="text-3xl font-black text-blue-400">{supervisors.length}</div>
          <div className={cn(adminMuted, "mt-1 text-sm")}>مشرف</div>
        </div>
      </div>

      {/* Staff table */}
      <div className={adminCardSolid}>
        <div className="border-b border-auth-outline-variant/30 px-6 py-4">
          <h3 className={adminSectionTitle}>فريق الإدارة</h3>
          <p className={cn(adminMuted, "mt-1 text-sm")}>{staff.length} عضو</p>
        </div>

        {loading ? (
          <SectionLoader message="جاري تحميل الفريق..." minHeight="min-h-[16rem]" />
        ) : fetchErr ? (
          <div className="p-6">
            <div className={adminErrorBox}>{fetchErr}</div>
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center text-auth-on-surface-variant">
            لا يوجد أعضاء في الفريق
          </div>
        ) : (
          <div className="divide-y divide-auth-outline-variant/20">
            {staff.map((user) => (
              <StaffRow
                key={user.id}
                user={user}
                onEdit={setEditUser}
                onDemote={setDemoteUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Permission help card */}
      <div className={cn(adminCardSolid, "p-5")}>
        <div className="flex items-start gap-3">
          <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-peak-orange" />
          <div>
            <h4 className="font-semibold text-auth-on-surface">كيف تعمل الصلاحيات؟</h4>
            <p className={cn(adminMuted, "mt-1 text-sm leading-relaxed")}>
              مدير النظام لديه وصول كامل لكل الصفحات والعمليات.
              المشرف يرى فقط الصفحات التي تم منحه إذن الوصول إليها.
              يمكن تعديل صلاحيات المشرف في أي وقت من خلال زر "الصلاحيات".
            </p>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl px-6 py-3 text-sm font-semibold shadow-xl transition-all",
            toast.type === "error"
              ? "bg-danger text-white"
              : "bg-success text-white"
          )}
        >
          {toast.msg}
        </div>
      ) : null}

      {/* Add supervisor modal */}
      {showAddModal ? (
        <AddSupervisorModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      ) : null}

      {/* Edit permissions modal */}
      {editUser ? (
        <PermissionsModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSavePermissions}
        />
      ) : null}

      {/* Demote confirm */}
      <AdminConfirmDialog
        open={!!demoteUser}
        title="إزالة المشرف"
        description={`هل تريد إزالة صلاحيات الإشراف من "${demoteUser?.full_name}"؟ سيتم تحويل حسابه إلى حساب طالب عادي.`}
        confirmLabel="نعم، إزالة"
        tone="danger"
        loading={actionLoading}
        onConfirm={handleDemote}
        onClose={() => setDemoteUser(null)}
      />
    </div>
  );
}
