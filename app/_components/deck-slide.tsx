"use client";

import type { Ranged, SectionOutput } from "@/lib/types";
import { fmtCurrency } from "@/lib/format";
import SlideView from "./slide-view";

/**
 * The framed deck slide — shared by the Preview slideshow and the Build cards so
 * "what you build is what you preview is what you export." Carries the same deck
 * chrome the .pptx does: ivory canvas, the fixed-layout SlideView body, the
 * exec-summary value strip, and the branded footer with page number.
 */

export const confidentialLabel = (mode: "draft" | "client") =>
  mode === "client" ? "Confidential" : "Confidential — Draft for discussion";

/** Branded footer on every content slide — mirrors the pptx master footer
 *  (clay mark · Business Value Services · confidentiality · page number). */
export function DeckFooter({
  pageNo,
  presentationMode,
}: {
  pageNo?: number;
  presentationMode: "draft" | "client";
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-line px-12 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-accent-bright" />
        <span className="text-[11px] font-semibold text-ink-secondary">Business Value Services</span>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-tertiary">
        <span>{confidentialLabel(presentationMode)}</span>
        {pageNo != null && (
          <span className="tabular-nums text-ink-secondary">{String(pageNo).padStart(2, "0")}</span>
        )}
      </div>
    </div>
  );
}

/** Conservative · base · upside value strip — mirrors addValueStrip; the exec
 *  summary is the one slide whose job is the full range. */
export function ValueStrip({ fig }: { fig: Ranged }) {
  return (
    <div className="mx-12 mb-3 flex items-stretch gap-6 rounded-xl border border-line bg-white px-7 py-4">
      <div className="flex flex-col justify-center">
        <div className="font-serif text-3xl font-semibold leading-none text-ink-secondary">{fmtCurrency(fig.low)}</div>
        <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
          Conservative
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="font-serif text-xl font-semibold text-accent">
          {fmtCurrency(fig.base)} · annual value, base case
        </div>
        <div className="mt-2.5 flex w-full max-w-md overflow-hidden rounded-full">
          <span className="h-1.5 flex-1 bg-muted" />
          <span className="h-1.5 flex-1 bg-accent-bright" />
          <span className="h-1.5 flex-1 bg-accent" />
        </div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <div className="font-serif text-3xl font-semibold leading-none text-ink">{fmtCurrency(fig.high)}</div>
        <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
          Upside
        </div>
      </div>
    </div>
  );
}

/** One content slide with full deck chrome: the SlideView body, the exec-summary
 *  value strip, and the branded footer with page number. */
export function DeckSectionSlide({
  section,
  fontScale = 1,
  pageNo,
  presentationMode,
}: {
  section: SectionOutput;
  fontScale?: number;
  pageNo?: number;
  presentationMode: "draft" | "client";
}) {
  const valueFig =
    section.kind === "executive_summary"
      ? section.rangedFigures?.annualValueFinalYear
      : undefined;
  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="min-h-0 flex-1 px-12 pb-2 pt-9">
        <div
          className="h-full origin-top-left"
          style={
            fontScale < 1
              ? {
                  transform: `scale(${fontScale})`,
                  width: `${100 / fontScale}%`,
                  height: `${100 / fontScale}%`,
                }
              : undefined
          }
        >
          <SlideView section={section} fixedLayout />
        </div>
      </div>
      {valueFig && <ValueStrip fig={valueFig} />}
      <DeckFooter pageNo={pageNo} presentationMode={presentationMode} />
    </div>
  );
}
