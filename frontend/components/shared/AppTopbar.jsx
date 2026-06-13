"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/shared/NotificationBell";
import Icon from "@/components/shared/Icon";
import MenuButton from "@/components/shared/MenuButton";
import PeakLogo from "@/components/shared/PeakLogo";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarProfile } from "@/hooks/useSidebarProfile";
import { ROLE_LABELS_AR } from "@/lib/profile-form";
import { getTopbarBreadcrumbs, getTopbarMeta } from "@/lib/topbar";
import {
  ROLE_QUICK_ACTIONS,
  ROLE_SEARCH_PLACEHOLDER,
  TOPBAR_THEMES
} from "@/lib/topbar-styles";
import { cn } from "@/lib/utils";

function UserAvatar({ fullName, avatarUrl, className, size = "md" }) {
  const initial = (fullName || "م").trim().slice(0, 1);
  const sizes = { md: "h-9 w-9 text-sm", sm: "h-8 w-8 text-xs" };

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

function TopbarBreadcrumbs({ crumbs, t }) {
  if (!crumbs?.length) return null;

  return (
    <nav aria-label="مسار الصفحة" className="mb-0.5 hidden flex-wrap items-center gap-1.5 text-xs sm:flex">
      {crumbs.map((crumb, index) => (
        <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 ? (
            <Icon name="arrowRight" size={12} className={cn("rotate-180 opacity-40", t.crumbSep)} aria-hidden />
          ) : null}
          {crumb.href && index < crumbs.length - 1 ? (
            <Link href={crumb.href} className={cn("font-semibold transition-colors hover:underline", t.crumbLink)}>
              {crumb.label}
            </Link>
          ) : (
            <span
              className={cn("font-bold", t.crumbCurrent)}
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

function TopbarSearch({ placeholder, t }) {
  const [query, setQuery] = useState("");

  return (
    <div className="relative hidden max-w-xs flex-1 lg:block xl:max-w-sm">
      <Icon
        name="search"
        size={17}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="بحث"
        className={cn(
          "h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low pe-10 ps-3 text-sm text-on-surface",
          "placeholder:text-on-surface-variant/60 transition-all",
          "focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container/30"
        )}
      />
    </div>
  );
}

function UserMenu({ profile, roleLabel, profileHref, profileMenuLabel, onLogout, t }) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id="topbar-user-menu-button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all",
          t.menuBtn,
          open && t.menuBtnOpen
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="topbar-user-menu"
      >
        <UserAvatar fullName={profile.full_name} avatarUrl={profile.avatar_url} className={t.avatar} size="sm" />
        <span className={cn("hidden max-w-[110px] truncate text-sm font-bold sm:inline", t.userName)}>
          {profile.full_name || "مستخدم"}
        </span>
        <Icon name="chevronDown" size={16} className={cn("hidden shrink-0 transition-transform sm:block", t.chevron, open && "rotate-180")} />
      </button>

      {open ? (
        <div
          id="topbar-user-menu"
          role="menu"
          aria-labelledby="topbar-user-menu-button"
          className={cn(
            "absolute end-0 top-[calc(100%+8px)] z-50 min-w-[240px] overflow-hidden rounded-2xl animate-[fadeIn_0.2s_ease-out]",
            t.dropdown
          )}
        >
          <div className={cn("border-b px-3 py-3", t.dropdownHeader)}>
            <p className={cn("truncate text-sm font-black", t.dropdownName)}>{profile.full_name || "مستخدم"}</p>
            {profile.email ? (
              <p className={cn("mt-0.5 truncate text-xs", t.dropdownEmail)} dir="ltr">
                {profile.email}
              </p>
            ) : null}
            <span className={cn("mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold", t.dropdownRole)}>
              {roleLabel}
            </span>
          </div>
          <div className="p-1.5">
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", t.dropdownItem)}
            >
              <Icon name="user" size={16} />
              {profileMenuLabel}
            </Link>
            <Link
              href="/"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", t.dropdownItem)}
            >
              <Icon name="globe" size={16} />
              الصفحة الرئيسية
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", t.dropdownLogout)}
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

function PageHeading({ meta, t }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex", t.iconWrap)} aria-hidden>
        <Icon name={meta.icon} size={22} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <TopbarBreadcrumbs crumbs={meta.breadcrumbs} t={t} />
        <h1 className={cn("truncate text-base font-black sm:text-lg", t.title)}>{meta.title}</h1>
        {meta.subtitle ? (
          <p className={cn("hidden truncate text-xs sm:block", t.subtitle)}>{meta.subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AppTopbar({
  role = "admin",
  onOpenMobile,
  variant = "surface",
  menuBreakpoint = "md",
  showSearch = null,
  displayName,
  displayAvatar,
  displayRoleLabel,
  displayEmail
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const sidebarProfile = useSidebarProfile();

  const profile = {
    full_name: displayName || sidebarProfile.full_name || user?.email?.split("@")[0] || "مستخدم",
    avatar_url: displayAvatar ?? sidebarProfile.avatar_url ?? null,
    email: displayEmail ?? sidebarProfile.email ?? user?.email ?? ""
  };
  const roleLabel = displayRoleLabel || sidebarProfile.roleLabel || ROLE_LABELS_AR[role] || role;
  const t = TOPBAR_THEMES[variant] || TOPBAR_THEMES.surface;
  const notifyTheme = variant === "brand" ? "brand" : variant === "surface" ? "surface" : "light";

  const meta = useMemo(() => {
    const base = getTopbarMeta(pathname || "", role);
    const breadcrumbs = getTopbarBreadcrumbs(pathname || "", role);
    return { ...base, breadcrumbs };
  }, [pathname, role]);

  const quickAction = ROLE_QUICK_ACTIONS[role];
  const searchEnabled = showSearch ?? ["admin", "teacher", "student"].includes(role);
  const searchPlaceholder = ROLE_SEARCH_PLACEHOLDER[role] || "بحث...";
  const menuClass = menuBreakpoint === "lg" ? "lg:hidden" : "md:hidden";

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  if (variant === "brand") {
    return (
      <header className={t.header}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:px-8">
          <Link href={meta.homeHref} className="shrink-0 transition-opacity hover:opacity-90">
            <PeakLogo variant="compact" subtitle={meta.panelLabel} showSubtitle={false} />
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
            <NotificationBell theme={notifyTheme} />
            <UserMenu
              profile={profile}
              roleLabel={roleLabel || meta.roleLabel}
              profileHref={meta.profileHref}
              profileMenuLabel={meta.profileMenuLabel}
              onLogout={handleLogout}
              t={t}
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={t.header}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {onOpenMobile ? (
            <div className={cn("shrink-0", menuClass)}>
              <MenuButton onClick={onOpenMobile} label="فتح قائمة التنقل" variant={variant} />
            </div>
          ) : null}
          <PageHeading meta={meta} t={t} />
          {searchEnabled ? <TopbarSearch placeholder={searchPlaceholder} t={t} /> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {quickAction ? (
            <Link
              href={quickAction.href}
              className={cn(
                "hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:inline-flex",
                t.quickAction
              )}
            >
              <Icon name={quickAction.icon} size={16} />
              {quickAction.label}
            </Link>
          ) : null}

          <span className={cn("hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold lg:inline-flex", t.roleBadge)}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary-container" aria-hidden />
            {roleLabel || meta.roleLabel}
          </span>

          <NotificationBell theme={notifyTheme} />

          <UserMenu
            profile={profile}
            roleLabel={roleLabel || meta.roleLabel}
            profileHref={meta.profileHref}
            profileMenuLabel={meta.profileMenuLabel}
            onLogout={handleLogout}
            t={t}
          />
        </div>
      </div>
    </header>
  );
}
