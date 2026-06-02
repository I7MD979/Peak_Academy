import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

const toneClasses = {
  success: "bg-success/10 text-success",
  blue: "bg-accent-blue/10 text-accent-blue",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning"
};

export default function StatsCard({ title, value, icon, iconName, tone = "blue", hint }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-text-muted">{title}</span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[tone])}>
          {iconName ? <Icon name={iconName} size={20} strokeWidth={2.25} /> : icon}
        </div>
      </div>
      <p className="text-2xl font-black text-text">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
