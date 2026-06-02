"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";

export default function AuthGuard({ roles, children }) {
  const router = useRouter();
  const { loading, isAuthenticated, user, roleHome } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (roles?.length && !roles.includes(user?.role)) {
      router.replace(roleHome[user?.role] || "/");
    }
  }, [isAuthenticated, loading, roleHome, roles, router, user?.role]);

  if (loading || !isAuthenticated) {
    return <div className="p-6 text-sm text-slate-500">Loading session...</div>;
  }
  if (roles?.length && !roles.includes(user?.role)) return null;
  return children;
}
