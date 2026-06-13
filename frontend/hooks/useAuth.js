"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearApiCache } from "@/lib/api-cache";
import { useAuthStore } from "@/store/authStore";
import { buildOAuthCallbackUrl } from "@/lib/auth-redirect";

export const useAuth = () => {
  const [supabase] = useState(() => createClient());

  const { user, session, loading, clearAuth } = useAuthStore();

  const signInWithGoogle = async ({ returnTo, intent } = {}) => {
    const redirectTo =
      typeof window !== "undefined"
        ? buildOAuthCallbackUrl(window.location.origin, returnTo, intent)
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { error };
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUpWithEmail = async (email, password) => {
    const emailRedirectTo =
      typeof window !== "undefined"
        ? buildOAuthCallbackUrl(window.location.origin)
        : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (data?.session) {
      useAuthStore.getState().setAuth({
        user: data.session.user ?? null,
        session: data.session,
      });
    }
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearApiCache();
    clearAuth();
  };

  return { user, session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut };
};
