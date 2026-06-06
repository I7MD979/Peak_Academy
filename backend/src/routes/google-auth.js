/**
 * Google OAuth Routes — Backend Handler
 * GET /api/auth/google         → redirect to Google
 * GET /api/auth/google/callback → handle callback
 */

import { Router } from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabase.js";
import { oauthLimiter, validateOAuthEmail } from "../middleware/oauth-security.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  createSupabaseSession,
  generateSupabaseMagicLink
} from "../services/google-oauth.service.js";

const router = Router();

const stateStore = new Map();
const STATE_TTL = 10 * 60 * 1000;

function generateState(returnTo = null) {
  const state = crypto.randomBytes(32).toString("hex");
  stateStore.set(state, {
    returnTo,
    createdAt: Date.now()
  });
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

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

function buildCallbackRedirect(frontendUrl, returnTo, isNew) {
  if (isNew) {
    const onboarding = `${frontendUrl}/onboarding`;
    if (returnTo) {
      return `${onboarding}?next=${encodeURIComponent(returnTo)}`;
    }
    return onboarding;
  }
  if (returnTo) {
    return `${frontendUrl}${returnTo.startsWith("/") ? returnTo : `/${returnTo}`}`;
  }
  return `${frontendUrl}/auth/callback`;
}

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

    const { isNew } = await createSupabaseSession(
      supabase,
      googleUser.email,
      googleUser.name,
      googleUser.picture
    );

    const redirectTo = buildCallbackRedirect(frontendUrl, stateData.returnTo, isNew);
    const magicLinkUrl = await generateSupabaseMagicLink(supabase, googleUser.email, redirectTo);

    if (magicLinkUrl) {
      return res.redirect(magicLinkUrl);
    }

    return res.redirect(redirectTo);
  } catch (err) {
    console.error("[google-auth] callback error:", err.message);
    return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }
});

export default router;
