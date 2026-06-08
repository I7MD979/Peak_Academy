"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearApiCache } from "@/lib/api-cache";
import { useAuthStore } from "@/store/authStore";

let authSubscription = null;

export default function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient());

  const setAuth = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        setAuth({ user: currentSession?.user || null, session: currentSession || null });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrap();

    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        clearApiCache();
        setAuth({ user: nextSession?.user || null, session: nextSession || null });
        setLoading(false);
      });
      authSubscription = data.subscription;
    }

    return () => {
      isMounted = false;
    };
  }, [setAuth, setLoading, supabase]);

  return children;
}
