import Link from "next/link";
import { SignInButton } from "../auth-button";

export default function AdminAuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Admin access
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          This Google account is not authorized.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Sign in with the allowlisted administrator account to view proposal analytics.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <SignInButton />
          <Link href="/" className="text-sm font-medium text-ink-secondary hover:text-accent">
            Return to builder
          </Link>
        </div>
      </section>
    </main>
  );
}
