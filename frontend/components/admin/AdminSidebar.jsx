"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

function Avatar({ fullName, avatarUrl }) {
  const initial = (fullName || "م").trim().slice(0, 1);
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-gradient-to-br from-accent/30 to-white/10 shadow-inner">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-white">{initial}</span>
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
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
        "text-white/75 hover:bg-white/10 hover:text-white",
        active &&
          "border-e-4 border-accent bg-gradient-to-l from-accent/20 to-white/5 font-bold text-white shadow-sm"
      )}
    >
      <NavIcon name={item.icon} active={active} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavSection({ title, items, pathname, onNavigate }) {
  return (
    <div className="space-y-1">
      {title ? (
        <p className="mb-2 px-3 text-[11px] font-bold tracking-wide text-white/45">{title}</p>
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
      className={cn(
        "flex h-full w-[260px] flex-col border-s border-white/10 bg-gradient-to-b from-primary via-primary to-[#0f1320] text-white shadow-xl",
        className
      )}
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
      <div className="border-b border-white/10 px-5 py-5">
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

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <nav aria-label="القائمة الرئيسية">
          <NavSection title="القائمة الرئيسية" items={visibleMainNav} pathname={pathname} onNavigate={onCloseMobile} />
        </nav>
        <nav aria-label="الحساب">
          <NavSection title="الحساب" items={ADMIN_NAV_ACCOUNT} pathname={pathname} onNavigate={onCloseMobile} />
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 pb-5 pt-4">
        <Link
          href="/admin/profile"
          onClick={onCloseMobile}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-all",
            profileActive
              ? "bg-white/10 ring-1 ring-accent/40"
              : "hover:bg-white/5"
          )}
        >
          <Avatar fullName={profile.full_name} avatarUrl={profile.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{profile.full_name || "مشرف"}</div>
            <div className="truncate text-xs text-white/65">
              {profile.roleLabel || (isAdmin ? "مدير النظام" : "مشرف")}
            </div>
          </div>
          <Icon name="user" size={16} className="shrink-0 text-white/40" />
        </Link>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full rounded-xl border-white/20 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
          onClick={handleLogout}
        >
          <Icon name="logout" size={16} />
          تسجيل الخروج
        </Button>
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
