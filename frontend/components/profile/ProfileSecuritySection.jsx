"use client";

import { useState } from "react";
import { toast } from "sonner";
import ProfileSectionCard from "@/components/profile/ProfileSectionCard";
import { Input } from "@/components/ui/input";
import { getProfileStyles } from "@/lib/profile-component-styles";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DESCRIPTIONS = {
  admin: "حدّث كلمة مرور تسجيل الدخول لحساب المشرف.",
  parent: "حدّث كلمة مرور تسجيل الدخول لحسابك.",
  student: "حدّث كلمة مرور تسجيل الدخول لحسابك.",
  teacher: "حدّث كلمة مرور تسجيل الدخول لحسابك."
};

export default function ProfileSecuritySection({
  variant = "admin",
  disabled = false,
  description,
  password: controlledPassword,
  confirmPassword: controlledConfirm,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit: controlledSubmit,
  saving: controlledSaving = false,
  idPrefix = "profile"
}) {
  const styles = getProfileStyles(variant);
  const resolvedDescription = description || DESCRIPTIONS[variant] || DESCRIPTIONS.admin;
  const isControlled = controlledSubmit != null;

  const [internalPassword, setInternalPassword] = useState("");
  const [internalConfirm, setInternalConfirm] = useState("");
  const [internalSaving, setInternalSaving] = useState(false);

  const password = isControlled ? controlledPassword : internalPassword;
  const confirmPassword = isControlled ? controlledConfirm : internalConfirm;
  const saving = isControlled ? controlledSaving : internalSaving;
  const busy = disabled || saving;

  const setPassword = (value) => {
    if (isControlled) onPasswordChange?.({ target: { value } });
    else setInternalPassword(value);
  };

  const setConfirmPassword = (value) => {
    if (isControlled) onConfirmPasswordChange?.({ target: { value } });
    else setInternalConfirm(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isControlled) {
      controlledSubmit?.();
      return;
    }

    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }

    setInternalSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح");
      setInternalPassword("");
      setInternalConfirm("");
    } catch (err) {
      toast.error(err.message || "تعذر تحديث كلمة المرور");
    } finally {
      setInternalSaving(false);
    }
  };

  const useUiInput = variant === "admin";
  const FieldInput = useUiInput ? Input : "input";
  const fieldClass = cn(styles.input, !useUiInput && "text-start");

  const formBody = (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}_new_password`} className={styles.label}>
          كلمة المرور الجديدة
        </label>
        <FieldInput
          id={`${idPrefix}_new_password`}
          type="password"
          autoComplete="new-password"
          value={password || ""}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          disabled={busy}
          minLength={8}
          dir="ltr"
          className={fieldClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}_confirm_password`} className={styles.label}>
          تأكيد كلمة المرور
        </label>
        <FieldInput
          id={`${idPrefix}_confirm_password`}
          type="password"
          autoComplete="new-password"
          value={confirmPassword || ""}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          disabled={busy}
          minLength={8}
          dir="ltr"
          className={fieldClass}
        />
      </div>
      <div className="md:col-span-2">
        {isControlled ? (
          <button
            type="button"
            disabled={busy}
            onClick={controlledSubmit}
            className={cn(styles.btnSecondary, busy && "opacity-60")}
          >
            {saving ? "جاري التحديث…" : "تحديث كلمة المرور"}
          </button>
        ) : (
          <button type="submit" className={cn(styles.btnPrimary, busy && "opacity-60")} disabled={busy}>
            {saving ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
          </button>
        )}
      </div>
    </>
  );

  return (
    <ProfileSectionCard
      variant={variant}
      title="الأمان وكلمة المرور"
      description={resolvedDescription}
      icon="shield"
    >
      {isControlled ? (
        <div className="grid gap-4 md:grid-cols-2">{formBody}</div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {formBody}
        </form>
      )}
    </ProfileSectionCard>
  );
}
