"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { redirectTo: "/admin" })}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-card hover:opacity-90"
    >
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/" })}
      className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-muted"
    >
      Sign out
    </button>
  );
}
