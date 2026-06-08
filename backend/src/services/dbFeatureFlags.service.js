import crypto from "crypto";
import { supabase } from "../lib/supabase.js";
import { getCacheEntry, setCacheEntry } from "../lib/cache.js";
import { isMissingTableError } from "../utils/db-errors.js";

const CACHE_TTL = 300;

async function cacheFlag(key, value) {
  try {
    await setCacheEntry(key, CACHE_TTL, value ? "1" : "0");
  } catch {
    /* optional cache */
  }
  return value;
}

export async function isFeatureEnabled(flagKey, userId, userContext = {}) {
  const cacheKey = `ff:${flagKey}:${userId}`;

  try {
    const cached = await getCacheEntry(cacheKey);
    if (cached === "1") return true;
    if (cached === "0") return false;
  } catch {
    /* optional cache */
  }

  try {
    const { data: flag } = await supabase.from("feature_flags").select("*").eq("key", flagKey).maybeSingle();

    if (!flag || !flag.is_enabled) return cacheFlag(cacheKey, false);

    const { data: override } = await supabase
      .from("feature_flag_overrides")
      .select("is_enabled")
      .eq("feature_flag_id", flag.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (override) return cacheFlag(cacheKey, override.is_enabled);

    const rules = flag.rules || {};

    if (rules.user_ids?.includes(userId)) return cacheFlag(cacheKey, true);
    if (rules.plans?.includes(userContext.planSlug)) return cacheFlag(cacheKey, true);
    if (rules.roles?.includes(userContext.role)) return cacheFlag(cacheKey, true);

    if (rules.percentage) {
      const hash = parseInt(crypto.createHash("md5").update(userId).digest("hex").slice(0, 8), 16) % 100;
      return cacheFlag(cacheKey, hash < rules.percentage);
    }

    return cacheFlag(cacheKey, true);
  } catch (err) {
    if (isMissingTableError(err)) return false;
    throw err;
  }
}

export async function getFeatureFlagForUser(req, res) {
  try {
    const { key } = req.params;
    const enabled = await isFeatureEnabled(key, req.user.id, {
      planSlug: req.user.planSlug,
      role: req.user.role
    });
    return res.json({ success: true, data: { key, enabled } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
