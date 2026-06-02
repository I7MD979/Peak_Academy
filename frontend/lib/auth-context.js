"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "./supabase/client";
import { authApi } from "./api";

const publicPaths = ["/auth/login", "/auth/register", "/", "/login"];

const roleHome = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard"
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function bootstrapSession() {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.access_token) {
          setUser(null);
          setToken(null);
          return;
        }

        setToken(session.access_token);
        const profileRes = await authApi.me(session.access_token);
        setUser(profileRes.data);
      } catch {
        if (!active) return;
        setUser(null);
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrapSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (!session?.access_token) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }
      setToken(session.access_token);
      try {
        const profileRes = await authApi.me(session.access_token);
        setUser(profileRes.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith("/auth"));
    if (!user && !isPublic && !pathname.startsWith("/onboarding")) {
      router.replace("/auth/login");
    }
  }, [loading, pathname, router, user]);

  const login = useCallback((_nextToken, nextUser) => {
    setUser(nextUser);
    router.replace(roleHome[nextUser?.role] || "/onboarding");
  }, [router]);

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    router.replace("/auth/login");
  }, [router]);

  const value = useMemo(
    () => ({
      loading,
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      roleHome
    }),
    [loading, token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
