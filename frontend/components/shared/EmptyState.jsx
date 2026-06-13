"use client";

import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { surfaceCard, textMuted } from "@/lib/semantic-styles";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon,
  iconName,
  title = "لا توجد بيانات",
  description,
  hint,
  action
}) {
  const bodyText = description ?? hint ?? "جرب لاحقاً أو غيّر الفلاتر.";

  return (
    <div className={cn(surfaceCard, "border-dashed p-6 text-center")}>
      {iconName ? (
        <Icon name={iconName} variant="xl" className="mx-auto text-auth-on-surface-variant" />
      ) : icon ? (
        <p className="text-3xl">{icon}</p>
      ) : null}
      <p className="text-lg font-bold text-auth-on-surface">{title}</p>
      {bodyText ? <p className={cn("mt-1 text-sm", textMuted)}>{bodyText}</p> : null}
      {action?.href ? (
        <Button href={action.href} className="mt-4 rounded-xl" variant="accent">
          {action.label}
        </Button>
      ) : action?.onClick ? (
        <Button type="button" className="mt-4 rounded-xl" variant="accent" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
