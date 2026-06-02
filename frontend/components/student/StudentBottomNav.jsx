"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/shared/NavIcon";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/student/dashboard", label: "الرئيسية", icon: "home" },
  { href: "/student/sessions", label: "الجلسات", icon: "book" },
  { href: "/student/study-rooms", label: "مذاكرة", icon: "school" },
  { href: "/student/ask", label: "اسأل", icon: "help" },
  { href: "/student/profile", label: "حسابي", icon: "user" }
];

export default function StudentBottomNav({ className }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-card/85",
        className
      )}
      aria-label="تنقل سفلي للطالب"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-between px-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (pathname || "").startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-bold text-text-muted transition-colors",
                active && "text-accent"
              )}
            >
              <NavIcon name={item.icon} active={active} variant="bottom" />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
