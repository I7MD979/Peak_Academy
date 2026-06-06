"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearApiCache } from "@/lib/api-cache";
import { useAuthStore } from "@/store/authStore";
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
      // استخدم الـ backend URL مباشرة — مش عبر الـ Next.js proxy
      const apiBase = (() => {
        if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
          return "https://api.peak-academy.net";
        }
        return "http://localhost:4000";
      })();
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
