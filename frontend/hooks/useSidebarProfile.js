"use client";

import { useCallback, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { getUserDisplay } from "@/lib/user-display";
import { useAuth } from "@/hooks/useAuth";

export const PROFILE_UPDATED = "peak-profile-updated";

export function useSidebarProfile() {
  const { user: authUser, session } = useAuth();
  const [apiUser, setApiUser] = useState(null);
  const accessToken = session?.access_token;

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setApiUser(null);
      return;
    }
    try {
      const res = await authApi.me(accessToken);
      setApiUser(res?.data || null);
    } catch {
      setApiUser(null);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    refresh();
  }, [accessToken, refresh]);

  useEffect(() => {
    const onUpdated = () => refresh();
    window.addEventListener(PROFILE_UPDATED, onUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED, onUpdated);
  }, [refresh]);

  return getUserDisplay(authUser, apiUser);
}

export function notifyProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED));
  }
}
