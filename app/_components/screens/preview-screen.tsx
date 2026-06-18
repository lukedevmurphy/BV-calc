"use client";

import { useEffect, useMemo, useState } from "react";
import type { SectionOutput } from "@/lib/types";
import { READOUT_ORDER } from "@/lib/sections/index";
import SectionCard from "../section-card";
import ExportButton from "../export-button";

interface Props {
  /** All computed sections (build order); Preview filters + re-sequences. */
  sections: SectionOutput[];
  companyName: string;
  onBack: () => void;
}

/**
 * Presentation-mode slideshow. Renders the SAME SectionOutput objects as the
 * Build screen, one per slide, but RE-SEQUENCED into readout order (lead with
 * value, then where it comes from, cost, break-even, the ask, then narrative).
 * Opens on the Executive Summary. Export to PowerPoint lives here, at the end,
 * and uses the normal build order via the unchanged /api/pptx path.
 */
export default function PreviewScreen({ sections, companyName, onBack }: Props) {
  const enabled = sections.filter((s) => s.enabled);

  // Readout sequence for the on-screen slideshow only.
  const slides = useMemo(() => {
    const rank = (k: SectionOutput["kind"]) => {
      const i = READOUT_ORDER.indexOf(k);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...enabled].sort((a, b) => rank(a.kind) - rank(b.kind));
  }, [enabled]);

  const [i, setI] = useState(0);
  const last = slides.length - 1;
  const clampedI = Math.min(i, Math.max(0, last));
  const current = slides[clampedI];

  const prev = () => setI((n) => Math.max(0, n - 1));
  const next = () => setI((n) => Math.min(last, n + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-ink-secondary">
        No sections enabled — go back to Build and enable at least one section.
        <div className="mt-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            ← Back: Build
          </button>
        </div>
      </div>
    );
  }

  const atEnd = clampedI === last;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Slide stage */}
      <div className="relative">
        <div className="min-h-[60vh] rounded-2xl border border-line bg-surface p-2 shadow-card">
          {/* Reuse the section component, expanded, no collapse control. */}
          <SectionCard section={current} />
        </div>

        {/* On-screen arrows */}
        <button
          onClick={prev}
          disabled={clampedI === 0}
          aria-label="Previous slide"
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-canvas p-2 shadow-card hover:bg-muted disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={next}
          disabled={atEnd}
          aria-label="Next slide"
          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-canvas p-2 shadow-card hover:bg-muted disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Footer: back, position, dots, export-at-end */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          ← Back: Build
        </button>

        <div className="flex items-center gap-3 text-xs text-ink-secondary">
          <span>
            Slide {clampedI + 1} / {slides.length} · {current.title.split("—")[0].trim()}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            {slides.map((s, idx) => (
              <button
                key={s.kind}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 w-1.5 rounded-full ${idx === clampedI ? "bg-accent" : "bg-line-strong"}`}
              />
            ))}
          </span>
          <span className="text-ink-tertiary">use ← → keys</span>
        </div>

        {/* Export lives at the end of Preview (highlighted on the last slide). */}
        <div className={atEnd ? "" : "opacity-90"}>
          <ExportButton companyName={companyName} sections={sections} />
        </div>
      </div>
    </div>
  );
}
