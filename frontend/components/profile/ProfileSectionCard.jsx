import Icon from "@/components/shared/Icon";
import { getProfileStyles } from "@/lib/profile-component-styles";
import { cn } from "@/lib/utils";

export default function ProfileSectionCard({
  title,
  description,
  icon = "user",
  children,
  className,
  variant = "admin"
}) {
  const styles = getProfileStyles(variant);

  return (
    <section className={cn(styles.cardSolid, "overflow-hidden p-5 md:p-6", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-peak-orange/15 text-peak-orange">
          <Icon name={icon} size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-auth-on-surface">{title}</h2>
          {description ? (
            <p className={cn("mt-1 text-sm leading-relaxed", styles.muted)}>{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
