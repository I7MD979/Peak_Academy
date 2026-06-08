import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon,
  title = "لا توجد بيانات",
  description,
  hint,
  action
}) {
  const bodyText = description ?? hint ?? "جرب لاحقاً أو غيّر الفلاتر.";

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
      {icon ? <p className="text-3xl">{icon}</p> : null}
      <p className="text-lg font-bold text-primary">{title}</p>
      {bodyText ? <p className="mt-1 text-sm text-text-muted">{bodyText}</p> : null}
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
