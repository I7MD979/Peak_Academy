"use client";

import Icon from "@/components/shared/Icon";
import ProfileSectionCard from "@/components/profile/ProfileSectionCard";
import { getProfileStyles } from "@/lib/profile-component-styles";
import { cn } from "@/lib/utils";

export default function ProfileLinkStudentPanel({
  linkCode = "",
  onLinkCodeChange,
  onLinkSubmit,
  linking = false,
  inputId = "parent-link-code",
  variant = "parent",
  embedded = false
}) {
  const styles = getProfileStyles(variant);

  const form = (
    <form onSubmit={onLinkSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor={inputId} className={cn("mb-1.5 block text-xs font-semibold", styles.mutedTextClass)}>
          كود الربط
        </label>
        <input
          id={inputId}
          value={linkCode}
          onChange={(event) => onLinkCodeChange?.(event.target.value.toUpperCase())}
          placeholder="مثال: ABC123"
          dir="ltr"
          maxLength={12}
          className={cn(styles.input, "font-mono uppercase tracking-wider")}
          autoComplete="off"
        />
      </div>
      <button type="submit" disabled={linking} className={cn(styles.btnPrimary, "shrink-0")}>
        <Icon name="plus" size={18} />
        {linking ? "جارٍ الربط…" : "ربط الطالب"}
      </button>
    </form>
  );

  if (embedded) {
    return form;
  }

  return (
    <ProfileSectionCard
      variant={variant}
      title="ربط ابن/ابنة"
      description="اطلب من ابنك كود الربط من صفحة «حسابي» في تطبيق الطالب."
      icon="plus"
      className="space-y-4"
    >
      {form}
    </ProfileSectionCard>
  );
}
