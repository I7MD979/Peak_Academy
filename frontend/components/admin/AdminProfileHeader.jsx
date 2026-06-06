import AdminActionsMenu from "@/components/admin/AdminActionsMenu";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import Icon from "@/components/shared/Icon";
import { adminBtnSecondary, adminCardSolid } from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

export default function AdminProfileHeader({
  eyebrow,
  title,
  subtitle,
  name,
  avatarUrl,
  roleLabel,
  refreshing,
  onRefresh,
  menuItems = []
}) {
  return (
    <section className={cn(adminCardSolid, "overflow-hidden p-6")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar
            name={name || title}
            avatarUrl={avatarUrl}
            size="lg"
            className="border-md-primary/30 bg-md-primary/15 text-md-primary"
          />
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-bold text-on-surface-variant">{eyebrow}</p> : null}
            <h1 className="mt-1 truncate text-2xl font-black text-on-surface md:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1 truncate text-sm text-on-surface-variant" dir="ltr">
                {subtitle}
              </p>
            ) : null}
            {roleLabel ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-md-primary/30 bg-md-primary/10 px-3 py-1 text-xs font-bold text-md-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-md-primary" aria-hidden />
                {roleLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {menuItems.length > 0 ? <AdminActionsMenu label="عمليات الحساب" items={menuItems} /> : null}
          {onRefresh ? (
            <button type="button" className={adminBtnSecondary} onClick={onRefresh} disabled={refreshing}>
              <Icon name="refresh" size={16} />
              {refreshing ? "جاري التحديث..." : "تحديث البيانات"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
