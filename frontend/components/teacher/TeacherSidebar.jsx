"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import NavIcon from "@/components/shared/NavIcon";
import PeakLogo from "@/components/shared/PeakLogo";
import { useAuth } from "@/hooks/useAuth";
import { getUserDisplay } from "@/lib/user-display";
import { cn } from "@/lib/utils";

function Avatar({ fullName, avatarUrl }) {
  const initial = (fullName || "?").trim().slice(0, 1);
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={fullName || "avatar"} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-white">{initial}</span>
      )}
    </div>
  );
}

export default function TeacherSidebar({ mobileOpen = false, onCloseMobile }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profile = getUserDisplay(user);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseMobile?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const navItems = useMemo(
    () => [
      { href: "/teacher/dashboard", label: "لوحتي", icon: "home" },
      { href: "/teacher/sessions", label: "جلساتي", icon: "calendarDays", matchPrefix: "/teacher/sessions", exact: false },
      { href: "/teacher/sessions/new", label: "جلسة جديدة", icon: "plus", matchPrefix: "/teacher/sessions/new", exact: true },
      { href: "/teacher/analytics", label: "تحليلاتي", icon: "barChart" },
      { href: "/teacher/earnings", label: "أرباحي", icon: "wallet" },
      { href: "/teacher/profile", label: "ملفي الشخصي", icon: "user" }
    ],
    []
  );

  const isNavActive = (item) => {
    if (item.exact) return pathname === item.href;
    if (item.matchPrefix === "/teacher/sessions") {
      return (
        pathname === "/teacher/sessions" ||
        (pathname?.startsWith("/teacher/sessions/") && !pathname?.startsWith("/teacher/sessions/new"))
      );
    }
    return pathname === item.href || (pathname || "").startsWith(`${item.href}/`);
  };

  const activeItemClass = "bg-accent/15 border-r-4 border-accent text-white hover:bg-accent/20";

  const Nav = ({ onNavigate }) => (
    <nav className="flex flex-col gap-1" aria-label="تنقل المدرس">
      {navItems.map((item) => {
        const active = isNavActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={() => onNavigate?.()}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10",
              active && activeItemClass
            )}
          >
            <NavIcon name={item.icon} active={active} />
            <span className="truncate font-bold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const SidebarBody = ({ showClose }) => (
    <aside className="flex h-full w-[248px] flex-col border-l border-white/10 bg-primary text-white">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <PeakLogo subtitle="لوحة المعلم" />
          {showClose ? (
            <button
              type="button"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10"
              onClick={onCloseMobile}
              aria-label="إغلاق القائمة"
            >
              <Icon name="close" size={20} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 px-3 pb-4">
        <Nav onNavigate={onCloseMobile} />
      </div>

      <div className="border-t border-white/10 px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Avatar fullName={profile?.full_name} avatarUrl={profile?.avatar_url} />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{profile.full_name || "معلم"}</div>
            <div className="truncate text-xs text-white/70">مدرس</div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <Icon name="logout" size={16} />
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex">
        <SidebarBody />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 right-0">
            <SidebarBody showClose />
          </div>
        </div>
      ) : null}
    </>
  );
}
