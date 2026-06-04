import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

export default function AdminSectionCard({
  title,
  description,
  icon = "user",
  children,
  className
}) {
  return (
    <section className={cn("glass-card overflow-hidden rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon name={icon} size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-text">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
