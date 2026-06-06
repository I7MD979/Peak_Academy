"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import PeakLogo from "@/components/shared/PeakLogo";
import NavIcon from "@/components/shared/NavIcon";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarProfile } from "@/hooks/useSidebarProfile";
import { isParentNavActive, PARENT_NAV_MAIN } from "@/lib/parent-nav";
import { parentBtnPrimary } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

function Avatar({ fullName, avatarUrl }) {
  const initial = (fullName || "و").trim().slice(0, 1);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-peak-orange/30 bg-auth-surface-highest">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-peak-orange">{initial}</span>
      )}
    </div>
  );
}

function NavLink({ item, pathname, onNavigate }) {
  const active = isParentNavActive(pathname, item);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 text-sm transition-colors",
        active
          ? "border-s-4 border-peak-orange bg-auth-surface-highest font-bold text-peak-orange"
          : "text-auth-on-surface-variant hover:bg-auth-surface-low hover:text-auth-on-surface"
      )}
    >
      <NavIcon name={item.icon} active={active} variant="admin" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarShell({ children, className }) {
  return (
    <aside
      className={cn(
        "flex h-full w-[260px] flex-col border-s border-auth-outline-variant/40 bg-auth-surface-lowest py-6",
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
  const profileActive = isParentNavActive(pathname, { href: "/parent/profile" });

  const handleLogout = async () => {
    onCloseMobile?.();
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <>
      <div className="mb-8 px-6">
        <div className="flex items-center justify-between gap-2">
          <PeakLogo
            href="/parent/dashboard"
            variant="full"
            subtitle="Parent Portal"
            className="min-w-0 flex-1"
            onClick={onCloseMobile}
          />
          {onCloseMobile ? (
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-auth-on-surface-variant transition-colors hover:bg-auth-surface-low"
              onClick={onCloseMobile}
              aria-label="إغلاق القائمة"
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2" aria-label="قائمة ولي الأمر">
        {PARENT_NAV_MAIN.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onCloseMobile} />
        ))}
      </nav>

      <div className="px-4 pt-4">
        <Link
          href="/parent/dashboard?link=1"
          onClick={onCloseMobile}
          className={cn(parentBtnPrimary, "w-full")}
        >
          <Icon name="plus" size={18} />
          ربط طالب
        </Link>
      </div>

      <div className="mt-auto border-t border-auth-outline-variant/30 px-4 pt-4">
        <Link
          href="/parent/profile"
          onClick={onCloseMobile}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-all",
            profileActive ? "bg-auth-surface-highest ring-1 ring-peak-orange/30" : "hover:bg-auth-surface-low"
          )}
        >
          <Avatar fullName={profile.full_name} avatarUrl={profile.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-auth-on-surface">
              {profile.full_name || "ولي أمر"}
            </div>
            <div className="truncate text-[10px] text-auth-on-surface-variant">
              {profile.roleLabel || "ولي أمر"}
            </div>
          </div>
        </Link>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-auth-outline-variant/40 py-2.5 text-sm font-bold text-auth-on-surface-variant transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
          onClick={handleLogout}
        >
          <Icon name="logout" size={16} />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

export default function ParentSidebar({ mobileOpen, onCloseMobile }) {
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
      <SidebarShell className="fixed inset-y-0 end-0 z-50 hidden md:flex">
        <SidebarContent pathname={pathname} onCloseMobile={undefined} />
      </SidebarShell>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="قائمة ولي الأمر">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
          />
          <div className="absolute inset-y-0 end-0 w-[min(280px,88vw)] shadow-2xl">
            <SidebarShell className="w-full">
              <SidebarContent pathname={pathname} onCloseMobile={onCloseMobile} />
            </SidebarShell>
          </div>
        </div>
      ) : null}
    </>
  );
}
