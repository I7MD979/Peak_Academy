import { Button } from "@/components/ui/button";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

export default function ProfileHero({
  eyebrow = "الملف الشخصي",
  title,
  subtitle,
  name,
  avatarUrl,
  actions,
  onRefresh,
  refreshing = false,
  refreshLabel = "تحديث"
}) {
  return (
    <section className="page-hero">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar name={name || title} avatarUrl={avatarUrl} />
          <div>
            <p className="text-sm text-white/70">{eyebrow}</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-white/75">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? "جارٍ التحديث..." : refreshLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
