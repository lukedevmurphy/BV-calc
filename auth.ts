import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** Refresh an expired Google access token with the stored refresh token. Returns
 *  a new token shape; on failure stamps `error` so the export route can ask the
 *  user to reconnect. */
async function refreshGoogleToken<T extends Record<string, unknown>>(token: T): Promise<T> {
  const refreshToken = token.refreshToken as string | undefined;
  if (!refreshToken) return { ...token, error: "RefreshFailed" };
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? "",
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!res.ok || !data.access_token) throw new Error("refresh failed");
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      // Google usually omits a new refresh_token on refresh — keep the old one.
      refreshToken: data.refresh_token ?? refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshFailed" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // Request the Drive scope so the app can create the Google Slides export
      // file. `drive.file` is narrow (only files this app creates) and
      // non-sensitive, so it needs no Google verification review.
      // prompt="select_account consent": always show the Google ACCOUNT CHOOSER
      // (so a signed-out user can pick a different account / "Use another
      // account" instead of being silently re-logged in) AND force the consent
      // screen; with access_type=offline that mints the refresh_token we need to
      // keep calling Drive after the access token expires.
      authorization: {
        params: {
          scope: `openid email profile ${DRIVE_SCOPE}`,
          access_type: "offline",
          prompt: "select_account consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/admin/auth-error" },
  callbacks: {
    // Everyone with a Google account is admitted — the sign-in is the email
    // capture, not a gate. Admin rights are enforced separately on /admin via
    // isAdminEmail. Reject only the degenerate case of a missing email.
    signIn({ profile, user }) {
      return Boolean(profile?.email ?? user.email);
    },
    // Persist the Google OAuth tokens in the JWT and refresh on expiry, so the
    // Slides export route can call the Drive API as the user.
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000) return token; // still valid
      return refreshGoogleToken(token);
    },
    // Expose the access token (the user's own; the whole app is auth-gated) and
    // any refresh error to the session so the export route can use them via
    // auth() — the same server-session pattern as app/api/proposals/route.ts.
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
