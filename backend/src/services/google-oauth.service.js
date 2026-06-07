/**
 * Google OAuth Service — Custom Backend Flow
 * إخفاء Supabase URL من المستخدمين
 * OWASP A07 | NIST IA-8
 */

import { google } from "googleapis";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];

export function getGoogleCallbackUrl() {
  return (
    process.env.GOOGLE_CALLBACK_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://api.peak-academy.net/api/auth/google/callback"
      : "http://localhost:4000/api/auth/google/callback")
  );
}

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleCallbackUrl());
}

export function buildGoogleAuthUrl(state) {
  const oauth2Client = createOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: state || "",
    prompt: "select_account"
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return { oauth2Client, tokens };
}

export async function getGoogleUserInfo(oauth2Client) {
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

export async function upsertSupabaseUser(supabase, googleUser) {
  const { email, picture } = googleUser;
  if (!email) throw new Error("No email from Google");

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, role, full_name")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    if (picture) {
      await supabase.from("users").update({ avatar_url: picture }).eq("id", existingUser.id);
    }
    return existingUser;
  }

  return null;
}

/**
 * إنشاء أو العثور على مستخدم Supabase Auth بعد Google OAuth
 */
export async function createSupabaseSession(supabase, email, name, picture) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingProfile = await upsertSupabaseUser(supabase, {
    email: normalizedEmail,
    name,
    picture
  });

  if (existingProfile) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(existingProfile.id);
    if (authError) throw authError;
    return { user: authData.user, isNew: false };
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      avatar_url: picture,
      provider: "google"
    }
  });

  if (createError) {
    if (!/already|exists|registered/i.test(createError.message)) {
      throw createError;
    }
    return { user: { email: normalizedEmail }, isNew: true };
  }

  return { user: created.user, isNew: true };
}

/**
 * إنشاء OTP link يرجع code في query param (مش access_token في fragment)
 * ده بيتوافق مع /auth/callback اللي بيتوقع ?code=
 */
export async function generateSupabaseMagicLink(supabase, email, redirectTo) {
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo }
    });

    if (error) {
      console.error("[google-oauth] generateLink error:", error.message);
      return null;
    }

    return data?.properties?.action_link || null;
  } catch (err) {
    console.error("[google-oauth] generateSupabaseMagicLink:", err.message);
    return null;
  }
}
