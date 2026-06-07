/**
 * Google OAuth Routes — Backend Handler
 * GET /api/auth/google              → redirect to Google
 * GET /api/auth/google/callback     → handle callback, issue short-lived JWT
 * POST /api/auth/google/exchange    → exchange one-time JWT for Supabase session
 */

import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import { oauthLimiter, validateOAuthEmail } from "../middleware/oauth-security.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  createSupabaseSession
} from "../services/google-oauth.service.js";

const router = Router();

// ─── State store (CSRF) ────────────────────────────────────────────────────
const stateStore = new Map();
const STATE_TTL = 10 * 60 * 1000;

function generateState(returnTo = null) {
  const state = crypto.randomBytes(32).toString("hex");
  stateStore.set(state, { returnTo, createdAt: Date.now() });
  setTimeout(() => stateStore.delete(state), STATE_TTL);
  return state;
}

function validateState(state) {
  if (!state || typeof state !== "string") return null;
  const data = stateStore.get(state);
  if (!data) return null;
  if (Date.now() - data.createdAt > STATE_TTL) {
    stateStore.delete(state);
    return null;
  }
  stateStore.delete(state);
  return data;
}

// ─── One-time token store (replay protection) ──────────────────────────────
// Stores jti values of tokens that have been used
const usedTokens = new Set();

function getJwtSecret() {
  const secret = process.env.OAUTH_TOKEN_SECRET || process.env.AUTH_JWT_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not configured");
  return secret;
}

function signOneTimeToken(email, returnTo) {
  const jti = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign(
    { email, returnTo: returnTo || null, jti },
    getJwtSecret(),
    { expiresIn: "2m", issuer: "peak-academy-oauth" }
  );
  return token;
}

function verifyOneTimeToken(token) {
  const payload = jwt.verify(token, getJwtSecret(), { issuer: "peak-academy-oauth" });
  if (usedTokens.has(payload.jti)) {
    throw new Error("Token already used");
  }
  // Mark used before any async work to prevent race conditions
  usedTokens.add(payload.jti);
  // Clean up after 60 seconds (well past the 15s TTL)
  setTimeout(() => usedTokens.delete(payload.jti), 60_000);
  return payload;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

// ─── GET /api/auth/google ──────────────────────────────────────────────────
router.get("/", oauthLimiter, (req, res) => {
  try {
    const returnTo = req.query.return_to || null;

    let safeReturnTo = null;
    if (returnTo && typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      safeReturnTo = returnTo.slice(0, 200);
    }

    const state = generateState(safeReturnTo);
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

    const stateData = validateState(state);
    if (!stateData) {
      console.warn(`[google-auth] invalid state from IP: ${req.ip}`);
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

    // Ensure user exists in Supabase auth + DB
    await createSupabaseSession(supabase, googleUser.email, googleUser.name, googleUser.picture);

    // Issue short-lived one-time JWT (15 seconds)
    const oneTimeToken = signOneTimeToken(googleUser.email, stateData.returnTo);

    // Redirect frontend to /auth/callback?token=<jwt>
    const callbackUrl = new URL(`${frontendUrl}/auth/callback`);
    callbackUrl.searchParams.set("token", oneTimeToken);
    if (stateData.returnTo) {
      callbackUrl.searchParams.set("next", stateData.returnTo);
    }

    return res.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("[google-auth] callback error:", err.message);
    return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }
});

// ─── POST /api/auth/google/exchange ───────────────────────────────────────
// Frontend calls this once with the one-time JWT to get a Supabase session.
// Uses Supabase REST API directly to avoid JS-client session-persistence issues.
router.post("/exchange", oauthLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "missing_token" });
    }

    let payload;
    try {
      payload = verifyOneTimeToken(token);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      const isUsed = err.message === "Token already used";
      console.warn(`[google-auth] exchange failed: ${err.message}`);
      return res.status(401).json({
        error: isExpired ? "token_expired" : isUsed ? "token_used" : "invalid_token"
      });
    }

    const email = payload.email;

    // Step 1: Generate a one-time OTP token for this user (server-side, no email sent)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "" }
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[google-auth] generateLink error:", linkError?.message);
      return res.status(500).json({ error: "session_generation_failed" });
    }

    // Step 2: Exchange the hashed token for a real Supabase session via REST API
    // POST /auth/v1/verify with token_hash returns JSON tokens (no redirect)
    const supabaseUrl = process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink"
      }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!verifyRes.ok) {
      const errBody = await verifyRes.json().catch(() => ({}));
      console.error("[google-auth] verify REST error:", errBody);
      return res.status(500).json({ error: "session_exchange_failed" });
    }

    const session = await verifyRes.json();

    if (!session?.access_token || !session?.refresh_token) {
      console.error("[google-auth] verify returned incomplete session");
      return res.status(500).json({ error: "session_incomplete" });
    }

    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in ?? 3600,
      user: {
        id: session.user?.id,
        email: session.user?.email
      }
    });
  } catch (err) {
    console.error("[google-auth] exchange error:", err.message);
    return res.status(500).json({ error: "exchange_failed" });
  }
});

export default router;
