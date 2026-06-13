import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getApiBaseUrl } from "@/lib/api-base";

export async function getServerAccessToken() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function fetchServerApi(path) {
  const token = await getServerAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
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
