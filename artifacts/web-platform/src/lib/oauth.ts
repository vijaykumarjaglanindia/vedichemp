/**
 * VEDIC HEMP — OAUTH SEAM (social sign-in).
 *
 * Set a provider's client id + secret and social sign-in activates; with none
 * set the sign-in page uses a labelled sandbox chooser. This module builds the
 * real authorize URL and exchanges the code for the buyer's email — the two
 * steps a route needs — without pulling in a provider SDK.
 */

import { envSet } from "@/lib/integrations";

export type OAuthProvider = "google" | "facebook";

export function oauthConfigured(p: OAuthProvider): boolean {
  return p === "google"
    ? envSet("GOOGLE_CLIENT_ID") && envSet("GOOGLE_CLIENT_SECRET")
    : envSet("FACEBOOK_CLIENT_ID") && envSet("FACEBOOK_CLIENT_SECRET");
}

const AUTHORIZE: Record<OAuthProvider, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  facebook: "https://www.facebook.com/v18.0/dialog/oauth",
};
const SCOPE: Record<OAuthProvider, string> = {
  google: "openid email profile",
  facebook: "email public_profile",
};

function clientId(p: OAuthProvider): string {
  return p === "google" ? process.env.GOOGLE_CLIENT_ID! : process.env.FACEBOOK_CLIENT_ID!;
}
function clientSecret(p: OAuthProvider): string {
  return p === "google" ? process.env.GOOGLE_CLIENT_SECRET! : process.env.FACEBOOK_CLIENT_SECRET!;
}

/** The provider's consent-screen URL, or null when the provider isn't configured. */
export function authorizeUrl(p: OAuthProvider, redirectUri: string, state: string): string | null {
  if (!oauthConfigured(p)) return null;
  const params = new URLSearchParams({
    client_id: clientId(p),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE[p],
    state,
  });
  return `${AUTHORIZE[p]}?${params.toString()}`;
}

/** Exchange the authorization code for the signed-in user's email. Null on failure. */
export async function exchangeCodeForEmail(p: OAuthProvider, code: string, redirectUri: string): Promise<string | null> {
  if (!oauthConfigured(p)) return null;
  try {
    const tokenUrl = p === "google" ? "https://oauth2.googleapis.com/token" : "https://graph.facebook.com/v18.0/oauth/access_token";
    const body = new URLSearchParams({ code, client_id: clientId(p), client_secret: clientSecret(p), redirect_uri: redirectUri, grant_type: "authorization_code" });
    const tokenRes = await fetch(tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (!tokenRes.ok) return null;
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) return null;

    const infoUrl = p === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.facebook.com/me?fields=email";
    const infoRes = await fetch(infoUrl, { headers: { authorization: `Bearer ${token.access_token}` } });
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as { email?: string };
    return info.email ?? null;
  } catch {
    return null;
  }
}
