"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearApiCache } from "@/lib/api-cache";
import { useAuthStore } from "@/store/authStore";
import { buildOAuthCallbackUrl } from "@/lib/auth-redirect";

export const useAuth = () => {
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const { user, session, loading, clearAuth } = useAuthStore();

  const signInWithGoogle = async ({ returnTo } = {}) => {
    const redirectTo =
      typeof window !== "undefined"
        ? buildOAuthCallbackUrl(window.location.origin, returnTo)
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    return { error };
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
