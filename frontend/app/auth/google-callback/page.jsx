"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function decodeBase64Url(value) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
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

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      dir="rtl"
    >
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-on-surface-variant text-sm">{status}</p>
      </div>
    </div>
  );
}
