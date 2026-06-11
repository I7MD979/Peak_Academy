"use client";

import { PageLoader } from "@/components/shared/LoadingSkeleton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("جاري تسجيل الدخول...");

  useEffect(() => {
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const safeToken = params.get("t");
        const safeNext = params.get("n");

        if (!safeToken) {
          router.replace("/auth/login?error=missing_token");
          return;
        }

        window.history.replaceState(null, "", window.location.pathname);

        const token = decodeBase64Url(safeToken);
        const returnTo = safeNext ? decodeBase64Url(safeNext) : null;

        const apiBase = "https://api.peak-academy.net";
        const res = await fetch(`${apiBase}/api/auth/google/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "omit",
        });

        const data = await res.json();

        if (!res.ok || !data.access_token) {
          console.error("[google-callback] exchange failed:", data.error);
          router.replace(`/auth/login?error=${data.error || "exchange_failed"}`);
          return;
        }

        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          console.error("[google-callback] setSession error:", sessionError.message);
          router.replace("/auth/login?error=session_failed");
          return;
        }

        setStatus("تم تسجيل الدخول! جاري التحويل...");

        await new Promise((r) => setTimeout(r, 500));

        const redirectTo = returnTo || "/student/dashboard";
        router.replace(redirectTo);
      } catch (err) {
        console.error("[google-callback] error:", err);
        router.replace("/auth/login?error=oauth_failed");
      }
    }

    handleCallback();
  }, [router]);

  return <PageLoader message={status} />;
}
