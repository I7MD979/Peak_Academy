"use client";

import { useCallback, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { getUserDisplay } from "@/lib/user-display";
import { useAuth } from "@/hooks/useAuth";

const PROFILE_UPDATED = "peak-profile-updated";

export function useSidebarProfile() {
  const { user: authUser, session } = useAuth();
  const [apiUser, setApiUser] = useState(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token) {
      setApiUser(null);
      return;
    }
    try {
      const res = await authApi.me();
      setApiUser(res?.data || null);
    } catch {
      setApiUser(null);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    refresh();
  }, [session?.access_token, refresh]);

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
