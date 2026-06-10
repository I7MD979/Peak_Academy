"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { isProfileComplete, ROLE_HOME } from "@/lib/role-routes";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import { useAuthStore } from "@/store/authStore";

export default function RoleGate({ roles, children }) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const loadingSession = useAuthStore((s) => s.loading);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function verifyRole() {
      if (loadingSession) return;

      if (!session?.access_token) {
        setChecking(false);
        router.replace("/auth/login");
        return;
      }

      try {
        const res = await authApi.me(session.access_token);
        if (!active) return;

        const user = res?.data;
        if (!isProfileComplete(user)) {
          router.replace("/onboarding");
          return;
        }

        if (roles?.length && !roles.includes(user.role)) {
          router.replace(ROLE_HOME[user.role] || "/onboarding");
          return;
        }

        setProfile(user);
      } catch (err) {
        if (!active) return;
        if (err?.status === 403 || err?.code === "PROFILE_INCOMPLETE") {
          router.replace("/onboarding");
          return;
        }
        router.replace("/auth/login");
      } finally {
        if (active) setChecking(false);
      }
    }

    verifyRole();

    return () => {
      active = false;
    };
  }, [loadingSession, roles, router, session?.access_token]);

  if (loadingSession || checking || !profile) {
    return <PageLoader />;
  }

  return children;
}
