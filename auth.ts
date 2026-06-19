import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAdminEmail } from "@/lib/auth/admin";

export const { handlers, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { error: "/admin/auth-error" },
  callbacks: {
    // Do the allowlist check while the OAuth account is being admitted, then
    // check again at the protected page boundary before reading analytics.
    signIn({ profile, user }) {
      return isAdminEmail(profile?.email ?? user.email);
    },
  },
});
