import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin-styles";

export default function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className
}) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-auth-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-black text-auth-on-surface md:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-auth-on-surface-variant">{subtitle}</p>
        ) : null}
      </div>

      {actions?.length ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const isPrimary = action.variant !== "secondary";
            const className = isPrimary ? adminBtnPrimary : adminBtnSecondary;

            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className={className}>
                  {action.icon ? <Icon name={action.icon} size={18} /> : null}
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={action.label}
                type="button"
                className={cn(className, action.disabled && "pointer-events-none opacity-60")}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon ? <Icon name={action.icon} size={18} /> : null}
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
