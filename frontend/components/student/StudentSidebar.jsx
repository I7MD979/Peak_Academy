"use client";

import { useEffect } from "react";
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
  const initial = (fullName || "؟").trim().slice(0, 1);
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

const navItems = [
  { href: "/student/dashboard", label: "الرئيسية", icon: "home" },
  { href: "/student/sessions", label: "الجلسات", icon: "book" },
  { href: "/student/study-rooms", label: "غرف المذاكرة", icon: "school" },
  { href: "/student/ask", label: "اسأل مدرس", icon: "help" },
  { href: "/student/profile", label: "حسابي", icon: "user" }
];

export default function StudentSidebar({ className, mobileOpen = false, onCloseMobile }) {
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

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const SidebarBody = ({ showClose }) => (
    <aside className="flex h-full w-[260px] flex-col border-l border-white/10 bg-primary text-white">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <PeakLogo subtitle="لوحة الطالب" />
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

      <nav className="flex-1 px-3 pb-4" aria-label="تنقل الطالب">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (pathname || "").startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10",
                  active && "border-r-4 border-accent bg-accent/15 text-white hover:bg-accent/20"
                )}
              >
                <NavIcon name={item.icon} active={active} />
                <span className="truncate font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Avatar fullName={profile?.full_name} avatarUrl={profile?.avatar_url} />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{profile?.full_name || "طالب"}</div>
            <div className="truncate text-xs text-white/70">طالب</div>
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
      <div className={cn("hidden md:flex", className)}>
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
