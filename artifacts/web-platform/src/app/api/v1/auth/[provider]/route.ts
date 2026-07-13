/**
 * VEDIC HEMP — SOCIAL SIGN-IN ENTRY (Google / Facebook)
 *
 * With provider keys configured (GOOGLE_CLIENT_ID / FACEBOOK_CLIENT_ID +
 * OAUTH_REDIRECT_BASE), this 302s to the real consent screen — the Auth.js
 * callback takes it from there. Without keys, it 302s to the clearly
 * labelled provider sandbox so the full flow still works end-to-end today.
 * Admin can never enter through a social provider (passkeys only).
 */

import { redirect } from "next/navigation";

const AUTHORIZE: Record<string, (clientId: string, redirectUri: string) => string> = {
  google: (id, cb) =>
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(cb)}&response_type=code&scope=openid%20email%20profile`,
  facebook: (id, cb) =>
    `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(cb)}&scope=email,public_profile`,
};

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }): Promise<Response> {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const role = url.searchParams.get("role") === "SELLER" ? "SELLER" : "BUYER";

  const build = AUTHORIZE[provider];
  if (!build) return Response.json({ error: "UNKNOWN_PROVIDER" }, { status: 404 });

  const clientId = provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.FACEBOOK_CLIENT_ID;
  const base = process.env.OAUTH_REDIRECT_BASE;
  if (clientId && base) {
    redirect(build(clientId, `${base}/api/v1/auth/${provider}/callback`));
  }
  redirect(`/signin/sandbox?provider=${provider}&role=${role}`);
}
