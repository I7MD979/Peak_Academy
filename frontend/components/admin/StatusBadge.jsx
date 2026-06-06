import { cn } from "@/lib/utils";

const styles = {
  scheduled: "bg-accent-blue/10 text-accent-blue",
  live: "bg-success/10 text-success",
  completed: "bg-surface-container-highest text-on-surface-variant",
  cancelled: "bg-danger/10 text-danger",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  paid: "bg-accent-blue/10 text-accent-blue",
  rejected: "bg-danger/10 text-danger",
  active: "bg-success/10 text-success",
  suspended: "bg-danger/10 text-danger"
};

const sessionLabels = {
  scheduled: "مجدولة",
  live: "مباشرة الآن",
  completed: "مكتملة",
  cancelled: "ملغاة"
};

const labels = {
  scheduled: "قادمة",
  live: "مباشر",
  completed: "منتهية",
  cancelled: "ملغاة",
  pending: "معلقة",
  approved: "مقبولة",
  paid: "مدفوعة",
  rejected: "مرفوضة",
  active: "نشط",
  suspended: "موقوف"
};

export default function StatusBadge({ status, variant }) {
  if (!status) return <span className="text-xs text-on-surface-variant">—</span>;

  const labelMap = variant === "session" ? { ...labels, ...sessionLabels } : labels;
  const displayLabel = labelMap[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
        styles[status] || "bg-surface-container-highest text-on-surface-variant"
      )}
    >
      {status === "live" ? (
        <span
          className={cn(
            "h-2 w-2 animate-pulse rounded-full",
            variant === "session" ? "bg-danger" : "bg-success"
          )}
        />
      ) : null}
      {displayLabel}
    </span>
  );
}
