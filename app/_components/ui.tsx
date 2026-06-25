import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared design-system primitives — the "Executive Business Case" deck grammar,
// extracted so every app screen reads like the exported deck instead of a
// generic form. These mirror lib/pptx/slide-builders.ts (the deck source of
// truth): clay dash + uppercase letterspaced kicker · editorial serif headline
// · slate lede · cream cards with hairline borders · clay square brand mark.
//
// Pure (no hooks/handlers), so they compose in both server and client screens.
// ─────────────────────────────────────────────────────────────────────────────

/** Clay dash + uppercase letterspaced label — the deck's kicker, on every
 *  screen. Mirrors the clay rule + section label in addHeader()/addTitleSlide. */
export function Kicker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-0.5 w-6 shrink-0 rounded-full bg-accent-bright" />
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        {children}
      </span>
    </div>
  );
}

/** Editorial page header: kicker → serif statement headline → optional lede,
 *  with an optional right-aligned action slot. The web mirror of addHeader(). */
export function PageHeader({
  kicker,
  title,
  lede,
  action,
  className = "",
}: {
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${className}`}
    >
      <div className="min-w-0 max-w-2xl">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink">
          {title}
        </h1>
        {lede && (
          <p className="mt-2.5 text-sm leading-relaxed text-ink-secondary">{lede}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Clay square mark + wordmark — the deck's footer brand, for screen chrome. */
export function BrandMark({
  className = "",
  muted = false,
}: {
  className?: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="h-2.5 w-2.5 rounded-[3px] bg-accent-bright" />
      <span
        className={`text-[11px] font-semibold tracking-tight ${
          muted ? "text-ink-tertiary" : "text-ink-secondary"
        }`}
      >
        Business Value Services
      </span>
    </div>
  );
}

/** Cream editorial card with a hairline border — the deck's stat/panel surface. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-5 shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

// Shared button treatments — clay primary, hairline secondary, quiet ghost.
// Letterspacing + weight echo the deck's restrained, editorial CTAs.
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40";
