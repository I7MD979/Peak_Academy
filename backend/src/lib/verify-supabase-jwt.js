import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, supabase } from "./supabase.js";

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function issuerMatchesBackend(token, supabaseUrl) {
  const payload = decodeJwtPayload(token);
  if (!payload?.iss) return true;
  const base = supabaseUrl.replace(/\/$/, "");
  const expected = `${base}/auth/v1`;
  return payload.iss === expected;
}

/**
 * Verify a user access token (ES256/HS256) against the configured Supabase project.
 * Tries SDK getUser, then Auth REST /auth/v1/user (works when env keys are misconfigured).
 */
export async function verifySupabaseAccessToken(token) {
  if (!token) return { user: null, error: "missing_token" };

  const { url, serviceKey } = getSupabaseConfig();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || "";

  if (!issuerMatchesBackend(token, url)) {
    const payload = decodeJwtPayload(token);
    console.error(
      "[auth] JWT issuer mismatch — token from",
      payload?.iss,
      "but backend SUPABASE_URL is",
      url
    );
    return { user: null, error: "issuer_mismatch" };
  }

  const {
    data: { user },
    error: sdkError
  } = await supabase.auth.getUser(token);

  if (!sdkError && user) {
    return { user, error: null };
  }

  const apiKey = anonKey || serviceKey;
  if (apiKey) {
    try {
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: apiKey
        }
      });

      if (res.ok) {
        const authUser = await res.json();
        if (authUser?.id) return { user: authUser, error: null };
      } else if (process.env.NODE_ENV !== "production") {
        const body = await res.text();
        console.warn("[auth] /auth/v1/user failed:", res.status, body);
      }
    } catch (fetchErr) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] /auth/v1/user fetch error:", fetchErr.message);
      }
    }
  }

  if (anonKey) {
    const anonClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    const retry = await anonClient.auth.getUser(token);
    if (!retry.error && retry.data.user) {
      return { user: retry.data.user, error: null };
    }
  }

  return {
    user: null,
    error: sdkError?.message || "invalid_token"
  };
}
