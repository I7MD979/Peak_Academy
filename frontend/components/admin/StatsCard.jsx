import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

const toneClasses = {
  success: "bg-success/10 text-success",
  blue: "bg-accent-blue/10 text-accent-blue",
  accent: "bg-peak-orange/10 text-peak-orange",
  warning: "bg-warning/10 text-warning"
};

const VARIANT_STYLES = {
  light: {
    card: "rounded-2xl border border-outline-variant/40 bg-surface-container shadow-sm",
    title: "text-on-surface-variant",
    value: "text-on-surface",
    hint: "text-on-surface-variant"
  },
  dark: {
    card: "rounded-xl border border-outline-variant bg-surface-container p-5 transition-colors hover:border-md-primary/30",
    title: "text-on-surface-variant",
    value: "text-on-surface",
    hint: "text-on-surface-variant"
  }
};

export default function StatsCard({ title, value, icon, iconName, tone = "blue", hint, variant = "dark" }) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.dark;

  return (
    <div className={cn(styles.card, variant === "light" && "hover:-translate-y-0.5 hover:shadow-md")}>
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("text-sm font-semibold", styles.title)}>{title}</span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[tone])}>
          {iconName ? <Icon name={iconName} size={20} strokeWidth={2.25} /> : icon}
        </div>
      </div>
      <p className={cn("text-2xl font-black", styles.value)}>{value}</p>
      {hint ? <p className={cn("mt-1 text-xs", styles.hint)}>{hint}</p> : null}
    </div>
  );
}
