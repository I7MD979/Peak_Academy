import { cn } from "@/lib/utils";

const styles = {
  scheduled: "bg-accent-blue/10 text-accent-blue",
  live: "bg-success/10 text-success",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-danger/10 text-danger",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  paid: "bg-accent-blue/10 text-accent-blue",
  rejected: "bg-danger/10 text-danger",
  active: "bg-success/10 text-success",
  suspended: "bg-danger/10 text-danger"
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

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-text-muted">—</span>;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
        styles[status] || "bg-slate-100 text-slate-600"
      )}
    >
      {status === "live" ? <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> : null}
      {labels[status] || status}
    </span>
  );
}
