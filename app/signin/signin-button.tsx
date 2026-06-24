"use client";

import { signIn } from "next-auth/react";

export function GoogleSignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      onClick={() => signIn("google", { redirectTo: callbackUrl })}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-card hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      Continue with Google
    </button>
  );
}
