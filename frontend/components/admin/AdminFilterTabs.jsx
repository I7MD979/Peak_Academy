import { cn } from "@/lib/utils";
import { adminFilterBar, adminFilterTab, adminFilterTabActive, adminFilterTabIdle } from "@/lib/admin-styles";

export default function AdminFilterTabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn(adminFilterBar, "w-fit", className)}>
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key ?? "all"}
            type="button"
            className={cn(adminFilterTab, active ? adminFilterTabActive : adminFilterTabIdle)}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {tab.badge != null ? (
              <span className="ms-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-danger/20 px-1.5 text-[10px] text-danger">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
