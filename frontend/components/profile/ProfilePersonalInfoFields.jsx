import { Input } from "@/components/ui/input";
import { getProfileStyles } from "@/lib/profile-component-styles";
import { cn } from "@/lib/utils";

export default function ProfilePersonalInfoFields({
  form,
  fieldErrors = {},
  email,
  onChange,
  disabled = false,
  showAvatarUrl = false,
  variant = "admin"
}) {
  const styles = getProfileStyles(variant);
  const useUiInput = variant === "admin";
  const FieldInput = useUiInput ? Input : "input";

  const fieldClass = (hasError) =>
    cn(
      styles.input,
      !useUiInput && hasError && "border-danger focus:border-danger focus:ring-danger/30",
      useUiInput && hasError && "border-danger"
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="full_name" className={styles.label}>
          الاسم الكامل *
        </label>
        <FieldInput
          id="full_name"
          value={form.full_name}
          onChange={onChange("full_name")}
          placeholder="مثال: أحمد محمد"
          disabled={disabled}
          className={fieldClass(fieldErrors.full_name)}
          required
        />
        {fieldErrors.full_name ? <p className="text-xs text-danger">{fieldErrors.full_name}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className={styles.label}>
          رقم الهاتف
        </label>
        <FieldInput
          id="phone"
          type="tel"
          dir="ltr"
          value={form.phone}
          onChange={onChange("phone")}
          placeholder="01xxxxxxxxx"
          disabled={disabled}
          className={cn(fieldClass(fieldErrors.phone), "text-start")}
        />
        {fieldErrors.phone ? <p className="text-xs text-danger">{fieldErrors.phone}</p> : null}
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <label htmlFor="email" className={styles.label}>
          البريد الإلكتروني
        </label>
        <FieldInput
          id="email"
          value={email || ""}
          disabled
          dir="ltr"
          className={cn(styles.input, styles.emailInputExtra, "text-start")}
        />
        <p className={cn("text-xs", styles.mutedTextClass)}>لا يمكن تغيير البريد من هذه الصفحة.</p>
      </div>

      {showAvatarUrl ? (
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="avatar_url" className={styles.label}>
            رابط الصورة الشخصية (اختياري)
          </label>
          <FieldInput
            id="avatar_url"
            dir="ltr"
            value={form.avatar_url}
            onChange={onChange("avatar_url")}
            placeholder="https://..."
            disabled={disabled}
            className={cn(fieldClass(fieldErrors.avatar_url), "text-start")}
          />
          {fieldErrors.avatar_url ? (
            <p className="text-xs text-danger">{fieldErrors.avatar_url}</p>
          ) : (
            <p className={cn("text-xs", styles.mutedTextClass)}>
              رابط مباشر لصورة واضحة (يفضّل مربعة). اترك الحقل فارغاً لإزالة الصورة.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
