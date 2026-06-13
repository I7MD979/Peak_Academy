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
  ADMIN_NAV_ACCOUNT,
  ADMIN_NAV_MAIN,
  isAdminNavActive
} from "@/lib/admin-nav";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
  sidebarShell,
  sidebarNav,
  sidebarNavLink,
  sidebarNavLinkActive,
  sidebarSectionTitle,
  sidebarFooter,
  sidebarProfileLink,
  sidebarProfileLinkActive,
  sidebarLogoutBtn,
  sidebarAvatar
} from "@/lib/sidebar-styles";
import { cn } from "@/lib/utils";

function Avatar({ fullName, avatarUrl }) {
  const initial = (fullName || "م").trim().slice(0, 1);
  return (
    <div className={cn(sidebarAvatar, "h-11 w-11 border-2")}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-md-primary">{initial}</span>
      )}
    </div>
  );
}

function NavLink({ item, pathname, onNavigate }) {
  const active = isAdminNavActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(sidebarNavLink, active && sidebarNavLinkActive)}
    >
      <NavIcon name={item.icon} active={active} variant="surface" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavSection({ title, items, pathname, onNavigate }) {
  return (
    <div className="space-y-1">
      {title ? (
        <p className={sidebarSectionTitle}>{title}</p>
      ) : null}
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function SidebarShell({ children, className }) {
  return (
    <aside
      className={cn(sidebarShell, className)}
    >
      {children}
    </aside>
  );
}

function SidebarContent({ pathname, onCloseMobile }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const profile = useSidebarProfile();
  const { can, isAdmin } = useAdminPermissions();
  const profileActive = isAdminNavActive(pathname, "/admin/profile");

  const visibleMainNav = ADMIN_NAV_MAIN.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (!item.permission) return true;
    return can(item.permission);
  });

  const handleLogout = async () => {
    onCloseMobile?.();
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <>
      <div className="border-b border-outline-variant/40 bg-gradient-to-b from-primary to-landing-navy2 px-5 py-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/admin/dashboard"
            onClick={onCloseMobile}
            className="min-w-0 flex-1 rounded-xl transition-opacity hover:opacity-90"
          >
            <PeakLogo subtitle="لوحة الإدارة" />
          </Link>
          {onCloseMobile ? (
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
              onClick={onCloseMobile}
              aria-label="إغلاق القائمة"
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </div>
      </div>

      <div className={cn(sidebarNav, "space-y-6")}>
        <nav aria-label="القائمة الرئيسية">
          <NavSection title="القائمة الرئيسية" items={visibleMainNav} pathname={pathname} onNavigate={onCloseMobile} />
        </nav>
        <nav aria-label="الحساب">
          <NavSection title="الحساب" items={ADMIN_NAV_ACCOUNT} pathname={pathname} onNavigate={onCloseMobile} />
        </nav>
      </div>

      <div className={sidebarFooter}>
        <Link
          href="/admin/profile"
          onClick={onCloseMobile}
          className={cn(sidebarProfileLink, profileActive && sidebarProfileLinkActive)}
        >
          <Avatar fullName={profile.full_name} avatarUrl={profile.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-on-surface">{profile.full_name || "مشرف"}</div>
            <div className="truncate text-xs text-on-surface-variant">
              {profile.roleLabel || (isAdmin ? "مدير النظام" : "مشرف")}
            </div>
          </div>
          <Icon name="user" size={16} className="shrink-0 text-on-surface-variant" />
        </Link>

        <button type="button" className={sidebarLogoutBtn} onClick={handleLogout}>
          <Icon name="logout" size={16} />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar({ mobileOpen, onCloseMobile }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;
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

  return (
    <>
      <SidebarShell className="fixed inset-y-0 start-0 z-40 hidden md:flex">
        <SidebarContent pathname={pathname} onCloseMobile={undefined} />
      </SidebarShell>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="قائمة الإدارة">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
          />
          <div className="absolute inset-y-0 right-0 w-[min(280px,88vw)] shadow-2xl">
            <SidebarShell className="w-full">
              <SidebarContent pathname={pathname} onCloseMobile={onCloseMobile} />
            </SidebarShell>
          </div>
        </div>
      ) : null}
    </>
  );
}
