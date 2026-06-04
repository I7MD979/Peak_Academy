"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/shared/NotificationBell";
import Icon from "@/components/shared/Icon";
import MenuButton from "@/components/shared/MenuButton";
import PeakLogo from "@/components/shared/PeakLogo";
import { useAuth } from "@/hooks/useAuth";
import { getTopbarBreadcrumbs, getTopbarMeta } from "@/lib/topbar";
import { getUserDisplay } from "@/lib/user-display";
import { cn } from "@/lib/utils";

function UserAvatar({ fullName, avatarUrl, className, size = "md" }) {
  const initial = (fullName || "م").trim().slice(0, 1);
  const sizes = {
    md: "h-9 w-9 text-sm",
    sm: "h-8 w-8 text-xs"
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-bold",
        sizes[size] || sizes.md,
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function TopbarBreadcrumbs({ crumbs, theme = "light" }) {
  if (!crumbs?.length) return null;
  const isBrand = theme === "brand";

  return (
    <nav aria-label="مسار الصفحة" className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs">
      {crumbs.map((crumb, index) => (
        <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 ? (
            <Icon
              name="arrowRight"
              size={12}
              className={cn("rotate-180 opacity-40", isBrand ? "text-white/50" : "text-text-muted")}
              aria-hidden
            />
          ) : null}
          {crumb.href && index < crumbs.length - 1 ? (
            <Link
              href={crumb.href}
              className={cn(
                "font-semibold transition-colors hover:underline",
                isBrand ? "text-white/70 hover:text-white" : "text-text-muted hover:text-accent"
              )}
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              className={cn(
                "font-bold",
                isBrand ? "text-white/90" : index === crumbs.length - 1 ? "text-text-muted" : "text-text"
              )}
              aria-current={index === crumbs.length - 1 ? "page" : undefined}
            >
              {crumb.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

function NotificationsButton({ theme = "light" }) {
  return <NotificationBell theme={theme} />;
}

function UserMenu({
  profile,
  roleLabel,
  profileHref,
  profileMenuLabel,
  onLogout,
  theme = "light"
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isBrand = theme === "brand";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id="topbar-user-menu-button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all",
          isBrand
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-border bg-card hover:border-accent/25 hover:shadow-sm",
          open && !isBrand && "border-accent/30 ring-2 ring-accent/10"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="topbar-user-menu"
      >
        <UserAvatar
          fullName={profile.full_name}
          avatarUrl={profile.avatar_url}
          className={
            isBrand ? "border-white/20 bg-white/15 text-white" : "border-border bg-primary/10 text-primary"
          }
        />
        <span
          className={cn(
            "hidden max-w-[110px] truncate text-sm font-bold sm:inline",
            isBrand ? "text-white" : "text-text"
          )}
        >
          {profile.full_name || "مستخدم"}
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={cn(
            "hidden shrink-0 transition-transform sm:block",
            isBrand ? "text-white/70" : "text-text-muted",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          id="topbar-user-menu"
          role="menu"
          aria-labelledby="topbar-user-menu-button"
          className="absolute end-0 top-[calc(100%+8px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl ring-1 ring-black/5 animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="border-b border-border bg-bg/50 px-3 py-3">
            <p className="truncate text-sm font-black text-text">{profile.full_name || "مستخدم"}</p>
            {profile.email ? (
              <p className="mt-0.5 truncate text-xs text-text-muted" dir="ltr">
                {profile.email}
              </p>
            ) : null}
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {roleLabel}
            </span>
          </div>
          <div className="p-1.5">
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-accent/10 hover:text-accent"
            >
              <Icon name="user" size={16} />
              {profileMenuLabel}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              <Icon name="logout" size={16} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageHeading({ meta, theme = "light" }) {
  const isBrand = theme === "brand";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex",
          isBrand ? "bg-white/10 text-accent" : "bg-accent/10 text-accent"
        )}
        aria-hidden
      >
        <Icon name={meta.icon} size={22} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <TopbarBreadcrumbs crumbs={meta.breadcrumbs} theme={theme} />
        <h1
          className={cn(
            "truncate text-base font-black sm:text-lg",
            isBrand ? "text-white" : "text-primary"
          )}
        >
          {meta.title}
        </h1>
        {meta.subtitle ? (
          <p
            className={cn(
              "hidden truncate text-xs sm:block",
              isBrand ? "text-white/65" : "text-text-muted"
            )}
          >
            {meta.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function AppTopbar({
  role = "admin",
  onOpenMobile,
  variant = "light",
  menuBreakpoint = "md",
  displayName,
  displayAvatar,
  displayRoleLabel,
  displayEmail
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const baseProfile = getUserDisplay(user);
  const profile = {
    ...baseProfile,
    full_name: displayName || baseProfile.full_name,
    avatar_url: displayAvatar ?? baseProfile.avatar_url,
    email: displayEmail ?? baseProfile.email
  };
  const roleLabel = displayRoleLabel || baseProfile.roleLabel;

  const meta = useMemo(() => {
    const base = getTopbarMeta(pathname || "", role);
    const breadcrumbs = getTopbarBreadcrumbs(pathname || "", role);
    return { ...base, breadcrumbs };
  }, [pathname, role]);

  const isBrand = variant === "brand";
  const showMenu = Boolean(onOpenMobile);
  const menuClass = menuBreakpoint === "lg" ? "lg:hidden" : "md:hidden";

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  if (isBrand) {
    return (
      <header className="sticky top-0 z-30 border-b border-white/10 bg-gradient-to-l from-primary to-[#12182a] shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href={meta.homeHref} className="shrink-0 transition-opacity hover:opacity-90">
            <PeakLogo subtitle={meta.panelLabel} />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/parent/report"
              className={cn(
                "hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors sm:inline-flex",
                pathname?.startsWith("/parent/report")
                  ? "bg-accent/20 text-accent"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon name="barChart" size={16} />
              التقرير
            </Link>

            <NotificationsButton theme="brand" />

            <UserMenu
              profile={profile}
              roleLabel={roleLabel || meta.roleLabel}
              profileHref={meta.profileHref}
              profileMenuLabel={meta.profileMenuLabel}
              onLogout={handleLogout}
              theme="brand"
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {showMenu ? (
            <div className={cn("shrink-0", menuClass)}>
              <MenuButton onClick={onOpenMobile} label="فتح قائمة التنقل" />
            </div>
          ) : null}

          <PageHeading meta={meta} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {roleLabel || meta.roleLabel}
          </span>

          <NotificationsButton />

          <UserMenu
            profile={profile}
            roleLabel={roleLabel || meta.roleLabel}
            profileHref={meta.profileHref}
            profileMenuLabel={meta.profileMenuLabel}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}
