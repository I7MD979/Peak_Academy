"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  adminCardSolid,
  adminInput,
  adminBtnPrimary,
  adminBtnSecondary,
  adminModalOverlay,
  adminLabel
} from "@/lib/admin-styles";
import { dashboardApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Modal for admin to edit a user's name and phone.
 *
 * Props:
 *   user          — the user object to edit (or null to close)
 *   onClose()     — close the modal
 *   onSaved(user) — called with the updated user object on success
 */
export default function AdminUserEditModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  if (!user) return null;

  const isDirty =
    name.trim() !== (user.full_name || "").trim() ||
    phone.trim() !== (user.phone || "").trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFieldError("الاسم مطلوب");
      return;
    }
    if (trimmedName.length > 100) {
      setFieldError("الاسم طويل جداً (100 حرف كحد أقصى)");
      return;
    }

    setLoading(true);
    try {
      const res = await dashboardApi.adminEditUser(user.id, {
        full_name: trimmedName,
        phone: phone.trim() || null
      });
      toast.success("تم تحديث بيانات المستخدم");
      onSaved?.(res?.data || { ...user, full_name: trimmedName, phone: phone.trim() || null });
      onClose?.();
    } catch (err) {
      toast.error(err.message || "تعذر تحديث البيانات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-md p-6 shadow-2xl")}>
        <h2 id="edit-user-title" className="mb-5 text-base font-bold text-auth-on-surface">
          تعديل بيانات المستخدم
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="edit-name">
              الاسم الكامل
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={adminInput}
              placeholder="أدخل الاسم الكامل"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className={cn(adminLabel, "mb-1.5 block")} htmlFor="edit-phone">
              رقم الهاتف
              <span className="mr-1 font-normal text-auth-on-surface-variant/60">(اختياري)</span>
            </label>
            <input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={adminInput}
              placeholder="01xxxxxxxxx"
              dir="ltr"
              maxLength={20}
            />
          </div>

          {fieldError ? (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
              {fieldError}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className={cn(adminBtnPrimary, "flex-1")}
              disabled={loading || !isDirty}
            >
              {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
