import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Kicker } from "@/app/_components/ui";
import { GoogleSignInButton } from "./signin-button";

export const dynamic = "force-dynamic";

/** The front door. Every visitor lands here first; signing in with Google is
 *  how we capture their email. Already-authenticated users are bounced straight
 *  to wherever they were headed.
 *
 *  Styled as the web counterpart of the deck COVER (addTitleSlide): the same
 *  kicker, big editorial serif headline, and brand-marked chrome — so the very
 *  first screen sets the McKinsey-grade tone the export delivers. */
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
    <main className="relative flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-accent-bright" />
          <span className="text-[11px] font-semibold tracking-tight text-ink-secondary">
            Business Value Services
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-ink-tertiary">
          Executive Overview
        </span>
      </header>

      <div className="flex flex-1 items-center px-6 sm:px-10">
        <div className="mx-auto w-full max-w-2xl py-10">
          <Kicker>Enterprise AI · Business Value Proposal</Kicker>
          <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl">
            Making AI the way
            <br />
            work gets done.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-secondary">
            Build a board-ready business case for enterprise AI — ranged
            economics, bottom-up value, and a presentation-grade deck, one export
            away.
          </p>

          <div className="mt-9">
            <GoogleSignInButton callbackUrl={target} />
            <p className="mt-3.5 text-xs leading-relaxed text-ink-tertiary">
              Sign in with your Google account to begin. We record your email so we
              can attribute the business cases you build.
            </p>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 sm:px-10">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-tertiary">
          Business Value Services
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-tertiary">
          Confidential — Draft for discussion
        </span>
      </footer>
    </main>
  );
}

/** Only allow same-origin relative paths as a post-login destination, so the
 *  callbackUrl param can never be used as an open redirect. */
function safeCallback(raw?: string): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}
