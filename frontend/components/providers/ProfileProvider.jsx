"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const PROFILE_UPDATED = "peak-profile-updated";

const ProfileContext = createContext(null);

function buildSeedUser(initialProfile, authUser) {
  if (!initialProfile && !authUser) return null;
  const meta = authUser?.user_metadata || {};
  return {
    id: initialProfile?.id || authUser?.id || "",
    full_name:
      initialProfile?.full_name || meta.full_name || authUser?.email?.split("@")[0] || "مستخدم",
    email: authUser?.email || "",
    role: initialProfile?.role || meta.role || "",
    avatar_url: meta.avatar_url || ""
  };
}

function isDisplayProfileSufficient(user) {
  return Boolean(user?.full_name && user?.email);
}

export function ProfileProvider({ initialProfile = null, children }) {
  const { user: authUser, session } = useAuth();
  const accessToken = session?.access_token;
  const [apiUser, setApiUser] = useState(() => buildSeedUser(initialProfile, authUser));

  useEffect(() => {
    setApiUser((prev) => {
      const seeded = buildSeedUser(initialProfile, authUser);
      if (!seeded) return prev;
      if (!prev) return seeded;
      return { ...seeded, avatar_url: prev.avatar_url || seeded.avatar_url };
    });
  }, [initialProfile, authUser]);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setApiUser(buildSeedUser(initialProfile, authUser));
      return;
    }
    try {
      const res = await authApi.me();
      setApiUser(res?.data || buildSeedUser(initialProfile, authUser));
    } catch {
      setApiUser(buildSeedUser(initialProfile, authUser));
    }
  }, [accessToken, authUser, initialProfile]);

  useEffect(() => {
    if (!accessToken) return;
    const seeded = buildSeedUser(initialProfile, authUser);
    if (isDisplayProfileSufficient(seeded)) return;
    refresh();
  }, [accessToken, authUser, initialProfile, refresh]);

  useEffect(() => {
    const onUpdated = () => refresh();
    window.addEventListener(PROFILE_UPDATED, onUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED, onUpdated);
  }, [refresh]);

  const value = useMemo(() => ({ apiUser, refresh }), [apiUser, refresh]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  return useContext(ProfileContext);
}
