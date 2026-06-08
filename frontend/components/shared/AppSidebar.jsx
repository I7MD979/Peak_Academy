"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import NavIcon from "@/components/shared/NavIcon";
import PeakLogo from "@/components/shared/PeakLogo";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarProfile } from "@/hooks/useSidebarProfile";
import {
  sidebarAvatar,
  sidebarCtaBtn,
  sidebarFooter,
  sidebarHeader,
  sidebarLogoutBtn,
  sidebarMobileOverlay,
  sidebarMobilePanel,
  sidebarNav,
  sidebarNavLink,
  sidebarNavLinkActive,
  sidebarProfileLink,
  sidebarProfileLinkActive,
  sidebarSectionTitle,
  sidebarShell
} from "@/lib/sidebar-styles";
import { cn } from "@/lib/utils";

function SidebarAvatar({ fullName, avatarUrl }) {
  const initial = (fullName || "؟").trim().slice(0, 1);
  return (
    <div className={sidebarAvatar}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-md-primary">{initial}</span>
      )}
    </div>
  );
}

function NavLink({ item, active, onNavigate }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn(sidebarNavLink, active && sidebarNavLinkActive)}
    >
      <NavIcon name={item.icon} active={active} variant="surface" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavSection({ title, items, pathname, isNavActive, onNavigate }) {
  return (
    <div className="space-y-1">
      {title ? <p className={sidebarSectionTitle}>{title}</p> : null}
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isNavActive(pathname, item)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarPanel({
  logoHref,
  subtitle,
  navMain,
  navAccount,
  navSections,
  pathname,
  isNavActive,
  profileHref,
  roleLabel,
  cta,
  onCloseMobile
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const profile = useSidebarProfile();
  const profileActive = profileHref ? isNavActive(pathname, { href: profileHref }) : false;

  const handleLogout = async () => {
    onCloseMobile?.();
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <>
      <div className={sidebarHeader}>
        <div className="flex items-center justify-between gap-2">
          <PeakLogo
            href={logoHref}
            variant="sidebar"
            subtitle={subtitle}
            onClick={onCloseMobile}
            className="min-w-0 flex-1"
          />
          {onCloseMobile ? (
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface md:hidden"
              onClick={onCloseMobile}
              aria-label="إغلاق القائمة"
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </div>
      </div>

      <div className={sidebarNav}>
        {navSections?.length
          ? navSections.map((section) => (
              <nav key={section.title} aria-label={section.title} className="mb-6 last:mb-0">
                <NavSection
                  title={section.title}
                  items={section.items}
                  pathname={pathname}
                  isNavActive={isNavActive}
                  onNavigate={onCloseMobile}
                />
              </nav>
            ))
          : (
            <nav aria-label={subtitle}>
              <NavSection
                items={navMain}
                pathname={pathname}
                isNavActive={isNavActive}
                onNavigate={onCloseMobile}
              />
            </nav>
          )}

        {navAccount?.length ? (
          <nav aria-label="الحساب" className="mt-6 border-t border-outline-variant/30 pt-4">
            <NavSection
              title="الحساب"
              items={navAccount}
              pathname={pathname}
              isNavActive={isNavActive}
              onNavigate={onCloseMobile}
            />
          </nav>
        ) : null}

        {cta ? (
          <div className="mt-4 px-1">
            <Link href={cta.href} onClick={onCloseMobile} className={sidebarCtaBtn}>
              {cta.icon ? <Icon name={cta.icon} size={18} /> : null}
              <span>{cta.label}</span>
            </Link>
          </div>
        ) : null}
      </div>

      <div className={sidebarFooter}>
        {profileHref ? (
          <Link
            href={profileHref}
            onClick={onCloseMobile}
            className={cn(sidebarProfileLink, profileActive && sidebarProfileLinkActive)}
          >
            <SidebarAvatar fullName={profile.full_name} avatarUrl={profile.avatar_url} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{profile.full_name || roleLabel}</div>
              <div className="truncate text-xs text-on-surface-variant">
                {profile.roleLabel || roleLabel}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <SidebarAvatar fullName={profile.full_name} avatarUrl={profile.avatar_url} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{profile.full_name || roleLabel}</div>
              <div className="truncate text-xs text-on-surface-variant">
                {profile.roleLabel || roleLabel}
              </div>
            </div>
          </div>
        )}

        <button type="button" className={sidebarLogoutBtn} onClick={handleLogout}>
          <Icon name="logout" size={16} />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

/**
 * Unified app sidebar — Arabic, MD3 dark, RTL-safe (fixed at start = right in RTL).
 */
export default function AppSidebar({
  logoHref,
  subtitle,
  navMain = [],
  navAccount = [],
  navSections = null,
  isNavActive,
  profileHref,
  roleLabel = "مستخدم",
  cta = null,
  mobileOpen = false,
  onCloseMobile
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseMobile?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  const panelProps = {
    logoHref,
    subtitle,
    navMain,
    navAccount,
    navSections,
    pathname,
    isNavActive,
    profileHref,
    roleLabel,
    cta
  };

  return (
    <>
      <aside className={cn(sidebarShell, "fixed inset-y-0 start-0 z-40 hidden md:flex")}>
        <SidebarPanel {...panelProps} onCloseMobile={undefined} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={subtitle}>
          <button type="button" className={sidebarMobileOverlay} onClick={onCloseMobile} aria-label="إغلاق القائمة" />
          <aside className={cn(sidebarShell, sidebarMobilePanel)}>
            <SidebarPanel {...panelProps} onCloseMobile={onCloseMobile} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
