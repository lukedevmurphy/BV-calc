import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GoogleSignInButton } from "./signin-button";

export const dynamic = "force-dynamic";

/** The front door. Every visitor lands here first; signing in with Google is
 *  how we capture their email. Already-authenticated users are bounced straight
 *  to wherever they were headed. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const target = safeCallback(callbackUrl);

  const session = await auth();
  if (session?.user?.email) redirect(target);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Business-value calculator
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Sign in to continue
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Use your Google account to enter. We record your email so we can
          attribute the business cases you build.
        </p>
        <div className="mt-7">
          <GoogleSignInButton callbackUrl={target} />
        </div>
      </section>
    </main>
  );
}

/** Only allow same-origin relative paths as a post-login destination, so the
 *  callbackUrl param can never be used as an open redirect. */
function safeCallback(raw?: string): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}
