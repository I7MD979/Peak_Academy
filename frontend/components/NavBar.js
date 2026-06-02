"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const linksByRole = {
  student: [
    { href: "/student/dashboard", label: "Dashboard" },
    { href: "/sessions", label: "Sessions" }
  ],
  teacher: [
    { href: "/teacher/dashboard", label: "Dashboard" },
    { href: "/sessions", label: "Sessions" }
  ],
  parent: [{ href: "/parent/dashboard", label: "Dashboard" }],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/sessions", label: "Sessions" }
  ]
};

export default function NavBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const links = linksByRole[user?.role] || [];

  return (
    <nav className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
      <Link href="/" className="mr-4 text-base font-semibold text-indigo-700">
        Peak Academy
      </Link>

      {!isAuthenticated && (
        <Link href="/auth/login" className="text-sm text-slate-600 hover:text-slate-900">
          Login
        </Link>
      )}

      {isAuthenticated &&
        links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              pathname === item.href && "bg-indigo-50 text-indigo-700"
            )}
          >
            {item.label}
          </Link>
        ))}

      {isAuthenticated && (
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {user?.full_name} ({user?.role})
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      )}
    </nav>
  );
}
