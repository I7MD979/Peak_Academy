"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/shared/Icon";
import NavIcon from "@/components/shared/NavIcon";
import PeakLogo from "@/components/shared/PeakLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/student/dashboard", label: "الرئيسية", icon: "home" },
  { href: "/student/sessions", label: "الجلسات", icon: "book" },
  { href: "/student/study-rooms", label: "غرف المذاكرة", icon: "school" },
  { href: "/student/ask", label: "اسأل مدرس", icon: "help" },
  { href: "/student/profile", label: "حسابي", icon: "user" }
];

export default function StudentSidebar({ className, mobileOpen = false, onCloseMobile }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseMobile?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const navContent = (
    <>
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center justify-between gap-3">
          <PeakLogo subtitle="لوحة الطالب" />
          {mobileOpen ? (
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

      <nav className="flex-1 space-y-1 px-3 pb-6">
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
      </nav>

      <div className="px-4 pb-6">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs text-white/70">نصيحة اليوم</p>
          <p className="mt-1 text-sm font-bold">ذاكر 25 دقيقة وخذ 5 دقائق راحة.</p>
        </div>
      </div>
    </>
  );

  const desktopSidebar = (
    <aside
      className={cn("flex w-[260px] flex-col border-l border-white/10 bg-primary text-white", className)}
      aria-label="تنقل الطالب"
    >
      {navContent}
    </aside>
  );

  const mobileDrawer = mobileOpen ? (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
      <div className="absolute inset-y-0 right-0 w-[260px]">
        <aside className="flex h-full w-full flex-col border-l border-white/10 bg-primary text-white">
          {navContent}
        </aside>
      </div>
    </div>
  ) : null;

  return (
    <>
      {desktopSidebar}
      {mobileDrawer}
    </>
  );
}
