/**
 * Google OAuth Routes — Stateless Implementation
 * Uses signed cookies for state (CSRF) instead of in-memory Map
 * Works correctly across multiple Railway instances
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

// ─── State: signed cookie (stateless, works across instances) ─────────────

function signState(returnTo) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    { nonce, returnTo: returnTo || null },
    getJwtSecret(),
    { expiresIn: "10m", issuer: "peak-academy-oauth-state" }
  );
}

function verifyState(stateToken) {
  try {
    return jwt.verify(stateToken, getJwtSecret(), {
      issuer: "peak-academy-oauth-state",
    });
  } catch {
    return null;
  }
}

// ─── One-time token: JWT with jti (stateless replay protection via short TTL) ─

function signOneTimeToken(email, returnTo) {
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    { email, returnTo: returnTo || null, jti },
    getJwtSecret(),
    { expiresIn: "3m", issuer: "peak-academy-oauth" }
  );
}

function verifyOneTimeToken(token) {
  return jwt.verify(token, getJwtSecret(), { issuer: "peak-academy-oauth" });
}

// ─── GET /api/auth/google ──────────────────────────────────────────────────
router.get("/", oauthLimiter, (req, res) => {
  try {
    const returnTo = req.query.return_to || null;
    let safeReturnTo = null;
    if (returnTo && typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      safeReturnTo = returnTo.slice(0, 200);
    }

    // Sign state as JWT — no server-side storage needed
    const stateToken = signState(safeReturnTo);

    // Store state in a short-lived cookie for CSRF verification
    res.cookie("oauth_state", stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: "/",
    });

    const authUrl = buildGoogleAuthUrl(stateToken);
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

    // Verify state from cookie (CSRF check)
    const cookieState = req.cookies?.oauth_state;
    if (!cookieState || cookieState !== state) {
      console.warn(`[google-auth] state mismatch — IP: ${req.ip}`);
      return res.redirect(`${frontendUrl}/auth/login?error=invalid_state`);
    }

    const stateData = verifyState(state);
    if (!stateData) {
      console.warn(`[google-auth] invalid state JWT — IP: ${req.ip}`);
      return res.redirect(`${frontendUrl}/auth/login?error=invalid_state`);
    }

    // Clear state cookie
    res.clearCookie("oauth_state", { path: "/" });

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

    // Issue one-time JWT (3 min TTL)
    const oneTimeToken = signOneTimeToken(googleUser.email, stateData.returnTo);

    // HTML form POST with base64url encoding (prevents JWT corruption in URL)
    const safeToken = Buffer.from(oneTimeToken).toString("base64url");
    const safeNext = stateData.returnTo
      ? Buffer.from(stateData.returnTo).toString("base64url")
      : "";
    const callbackUrl = `${frontendUrl}/auth/callback`;

    return res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>جاري تسجيل الدخول...</title>
  <style>
    body{margin:0;background:#0a0c0c;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Cairo,sans-serif}
    .l{text-align:center;color:rgba(255,255,255,0.6)}
    .s{width:40px;height:40px;border:3px solid rgba(245,114,26,0.2);border-top-color:#f5721a;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="l"><div class="s"></div><p>جاري تسجيل الدخول...</p></div>
  <form id="f" method="POST" action="${callbackUrl}">
    <input type="hidden" name="t" value="${safeToken}">
    ${safeNext ? `<input type="hidden" name="n" value="${safeNext}">` : ""}
  </form>
  <script>document.getElementById('f').submit();</script>
</body>
</html>`);

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
      payload = verifyOneTimeToken(token);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      console.warn(`[google-auth] exchange failed: ${err.message}`);
      return res.status(401).json({
        error: isExpired ? "token_expired" : "invalid_token",
      });
    }

    const email = payload.email;

    // Generate Supabase session via OTP verify
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
