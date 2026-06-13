import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";

function isLocalhostUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isPeakFrontendHost(hostname) {
  return (
    hostname === "peak-academy.net" ||
    hostname === "www.peak-academy.net" ||
    hostname.endsWith(".vercel.app")
  );
}

async function resolveServerApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured && !isLocalhostUrl(configured)) {
    return normalizeApiBaseUrl(configured);
  }

  const upstream = process.env.API_UPSTREAM_URL?.trim();
  if (upstream) {
    const base = upstream.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const hostname = host?.split(":")[0] || "";
    if (hostname && isPeakFrontendHost(hostname)) {
      const proto = headerList.get("x-forwarded-proto") || "https";
      return `${proto}://${host}/peak-api`;
    }
  } catch {
    // headers() unavailable outside a request — fall back below
  }

  return getApiBaseUrl();
}

export async function getServerAccessToken() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchServerApi(path) {
  try {
    const token = await getServerAccessToken();
    if (!token) return null;

    const baseUrl = await resolveServerApiBaseUrl();
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.success ? payload.data : null;
  } catch {
    return null;
  }
}
