// Module augmentation: carry the Google OAuth tokens (for the Drive/Slides
// export) on the JWT and surface the access token + refresh error on the
// session. See auth.ts.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
