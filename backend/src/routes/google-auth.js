/**
 * Google OAuth Routes — Redis-backed state and single-use tokens
 * Shared across Railway instances via Upstash Redis
 *
 * LEGACY: The frontend no longer starts Google sign-in through these routes.
 * Current flow uses Supabase `signInWithOAuth` → `/auth/callback?code=`.
 * Kept for backward compatibility with old bookmarks / `/auth/google-callback`.
 */

import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import { getRedis } from "../lib/redis.js";
import { oauthLimiter, validateOAuthEmail } from "../middleware/oauth-security.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  createSupabaseSession,
} from "../services/google-oauth.service.js";

const router = Router();

function getJwtSecret() {
  const secret =
    process.env.OAUTH_TOKEN_SECRET ||
    process.env.AUTH_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!secret) throw new Error("OAUTH_TOKEN_SECRET is not configured");
  return secret;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

// ─── State: Redis single-use (10 min TTL) ──────────────────────────────────

async function generateState(returnTo = null) {
  const state = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  if (redis) {
    await redis.set(
      `oauth:state:${state}`,
      JSON.stringify({ returnTo: returnTo || null }),
      { ex: 600 }
    );
  }
  return state;
}

async function validateState(state) {
  if (!state || typeof state !== "string") return null;
  const redis = getRedis();
  if (!redis) return { returnTo: null };

  const key = `oauth:state:${state}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  await redis.del(key);

  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

// ─── One-time token: JWT + Redis single-use jti ────────────────────────────

function signOneTimeToken(email, returnTo) {
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    { email, returnTo: returnTo || null, jti },
    getJwtSecret(),
    { expiresIn: "10m", issuer: "peak-academy-oauth" }
  );
}

async function verifyOneTimeToken(token) {
  const payload = jwt.verify(token, getJwtSecret(), { issuer: "peak-academy-oauth" });

  const redis = getRedis();
  if (redis) {
    const redisKey = `oauth:used:${payload.jti}`;
    const alreadyUsed = await redis.get(redisKey);
    if (alreadyUsed) {
      throw Object.assign(new Error("Token already used"), { code: "token_used" });
    }
    await redis.set(redisKey, "1", { ex: 300 });
  }

  return payload;
}

// ─── GET /api/auth/google ──────────────────────────────────────────────────
router.get("/", oauthLimiter, async (req, res) => {
  try {
    const returnTo = req.query.return_to || null;
    let safeReturnTo = null;
    if (returnTo && typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      safeReturnTo = returnTo.slice(0, 200);
    }

    const state = await generateState(safeReturnTo);
    const authUrl = buildGoogleAuthUrl(state);
    res.redirect(authUrl);
  } catch (err) {
    console.error("[google-auth] initiate error:", err.message);
    res.redirect(`${getFrontendUrl()}/auth/login?error=oauth_init_failed`);
  }
});

// ─── GET /api/auth/google/callback ────────────────────────────────────────
router.get("/callback", oauthLimiter, async (req, res) => {
  const frontendUrl = getFrontendUrl();

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.warn(`[google-auth] Google error: ${oauthError}`);
      return res.redirect(`${frontendUrl}/auth/login?error=google_denied`);
    }

    const stateData = await validateState(state);
    if (!stateData) {
      console.warn(`[google-auth] invalid state — IP: ${req.ip}`);
      return res.redirect(`${frontendUrl}/auth/login?error=invalid_state`);
    }

    if (!code || typeof code !== "string") {
      return res.redirect(`${frontendUrl}/auth/login?error=missing_code`);
    }

    const { oauth2Client } = await exchangeCodeForTokens(code);
    const googleUser = await getGoogleUserInfo(oauth2Client);

    if (!googleUser?.email) {
      return res.redirect(`${frontendUrl}/auth/login?error=no_email`);
    }

    const emailCheck = validateOAuthEmail(googleUser.email);
    if (!emailCheck.valid) {
      console.warn(`[google-auth] rejected email: ${emailCheck.reason}`);
      return res.redirect(`${frontendUrl}/auth/login?error=email_not_allowed`);
    }

    await createSupabaseSession(supabase, googleUser.email, googleUser.name, googleUser.picture);

    const oneTimeToken = signOneTimeToken(googleUser.email, stateData.returnTo);

    const safeToken = Buffer.from(oneTimeToken).toString("base64url");
    const safeNext = stateData.returnTo
      ? Buffer.from(stateData.returnTo).toString("base64url")
      : "";
    const callbackUrl = new URL(`${frontendUrl}/auth/google-callback`);
    callbackUrl.searchParams.set("t", safeToken);
    if (safeNext) callbackUrl.searchParams.set("n", safeNext);
    return res.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("[google-auth] callback error:", err.message);
    return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }
});

// ─── POST /api/auth/google/exchange ───────────────────────────────────────
router.post("/exchange", oauthLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "missing_token" });
    }

    let payload;
    try {
      payload = await verifyOneTimeToken(token);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      const isUsed = err.code === "token_used" || err.message === "Token already used";
      console.warn(`[google-auth] exchange failed: ${err.message}`);
      return res.status(401).json({
        error: isExpired ? "token_expired" : isUsed ? "token_used" : "invalid_token",
      });
    }

    const email = payload.email;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "" },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[google-auth] generateLink error:", linkError?.message);
      return res.status(500).json({ error: "session_generation_failed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!verifyRes.ok) {
      const errBody = await verifyRes.json().catch(() => ({}));
      console.error("[google-auth] verify REST error:", errBody);
      return res.status(500).json({ error: "session_exchange_failed" });
    }

    const session = await verifyRes.json();

    if (!session?.access_token || !session?.refresh_token) {
      return res.status(500).json({ error: "session_incomplete" });
    }

    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in ?? 3600,
      user: { id: session.user?.id, email: session.user?.email },
    });
  } catch (err) {
    console.error("[google-auth] exchange error:", err.message);
    return res.status(500).json({ error: "exchange_failed" });
  }
});

export default router;
