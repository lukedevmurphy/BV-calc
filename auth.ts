import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/admin/auth-error" },
  callbacks: {
    // Everyone with a Google account is admitted — the sign-in is the email
    // capture, not a gate. Admin rights are enforced separately on /admin via
    // isAdminEmail. Reject only the degenerate case of a missing email.
    signIn({ profile, user }) {
      return Boolean(profile?.email ?? user.email);
    },
  },
});
