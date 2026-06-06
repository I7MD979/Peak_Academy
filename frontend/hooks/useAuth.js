"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearApiCache } from "@/lib/api-cache";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/api-base";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export const useAuth = () => {
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const { user, session, loading, clearAuth } = useAuthStore();

  const signInWithGoogle = async ({ returnTo } = {}) => {
    try {
      const apiBase = getApiBaseUrl()
        .replace(/\/api$/, "")
        .replace(/\/peak-api$/, "");
      const params = new URLSearchParams();
      const safeReturnTo = sanitizeRedirectPath(returnTo);
      if (safeReturnTo) params.set("return_to", safeReturnTo);

      window.location.href = `${apiBase}/api/auth/google${params.toString() ? `?${params}` : ""}`;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearApiCache();
    clearAuth();
  };

  return { user, session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut };
};
