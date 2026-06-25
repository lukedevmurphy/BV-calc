"use client";

import { useEffect, useMemo, useState } from "react";
import type { SectionOutput } from "@/lib/types";
import { READOUT_ORDER } from "@/lib/sections/index";
import { scenarioAppendixSlides } from "@/lib/sections/scenario";
import { planSection } from "@/lib/slide-fit/plan";
import SlideView from "../slide-view";
import ExportButton from "../export-button";
import ScaledSlide from "../scaled-slide";

interface Props {
  /** All computed sections (build order); Preview filters + re-sequences. */
  sections: SectionOutput[];
  companyName: string;
  sectionsPending: boolean;
  /** Footer chrome for the export; section warnings are gated in `sections`. */
  presentationMode?: "draft" | "client";
  onBack: () => void;
}

type Slide =
  | { type: "section"; section: SectionOutput; fontScale: number }
  | { type: "divider" };

function inferFinalYear(sections: SectionOutput[]): number {
  let max = 0;
  for (const s of sections)
    for (const st of s.stats ?? []) {
      const m = st.label.match(/Y(?:ear)?\s*(\d+)/i);
      if (m) max = Math.max(max, Number(m[1]));
    }
  return max || 3;
}

/**
 * Presentation-mode slideshow — a full-frame, 16:9 what-you-see-is-what-you-
 * export view of the deck. MAIN deck is re-sequenced into readout order (value
 * first), opens on the Executive Summary; the APPENDIX (sections dragged below
 * the divider, plus the auto-generated conservative / upside scenario slides)
 * follows a dark divider slide — exactly the order /api/pptx exports.
 */
export default function PreviewScreen({
  sections,
  companyName,
  sectionsPending,
  presentationMode = "draft",
  onBack,
}: Props) {
  const slides: Slide[] = useMemo(() => {
    const enabled = sections.filter((s) => s.enabled);
    const rank = (k: SectionOutput["kind"]) => {
      const i = READOUT_ORDER.indexOf(k);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const main = enabled.filter((s) => !s.appendix).sort((a, b) => rank(a.kind) - rank(b.kind));
    const appendixSecs = enabled.filter((s) => s.appendix).sort((a, b) => a.order - b.order);
    const scenarios = scenarioAppendixSlides(enabled, inferFinalYear(enabled));

    // Same slide-fit engine as /api/pptx, so the preview splits / summarizes /
    // compacts exactly as the exported deck does (a slide that summarizes to an
    // appendix on export does so here too).
    const plannedMain = main.flatMap(planSection);
    const plannedDragged = appendixSecs.flatMap(planSection);
    const plannedScenarios = scenarios.flatMap(planSection);

    const mainFlow = plannedMain.filter((p) => p.placement === "main");
    const appendixFlow = [
      ...plannedDragged,
      ...plannedMain.filter((p) => p.placement === "appendix"),
      ...plannedScenarios,
    ];

    const out: Slide[] = mainFlow.map((p) => ({
      type: "section",
      section: p.section,
      fontScale: p.fontScale,
    }));
    if (appendixFlow.length > 0) {
      out.push({ type: "divider" });
      appendixFlow.forEach((p) =>
        out.push({ type: "section", section: p.section, fontScale: p.fontScale }),
      );
    }
    return out;
  }, [sections]);

  const [i, setI] = useState(0);
  const last = slides.length - 1;
  const clampedI = Math.min(i, Math.max(0, last));
  const current = slides[clampedI];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") setI((n) => Math.min(last, n + 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
  const label =
    current.type === "divider"
      ? "Appendix"
      : current.section.title.split("—")[0].trim();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-5">
      <div className="relative">
        {/* 16:9 slide frame — fills the stage like a slide being presented */}
        <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <ScaledSlide>
            {current.type === "divider" ? (
              <AppendixDividerSlide />
            ) : (
              <div className="h-full px-12 py-10">
                <div
                  className="origin-top-left"
                  style={
                    current.fontScale < 1
                      ? {
                          transform: `scale(${current.fontScale})`,
                          width: `${100 / current.fontScale}%`,
                          height: `${100 / current.fontScale}%`,
                        }
                      : undefined
                  }
                >
                  <SlideView section={current.section} fixedLayout />
                </div>
              </div>
            )}
          </ScaledSlide>
        </div>

        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          disabled={clampedI === 0}
          aria-label="Previous slide"
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-canvas p-2 shadow-card hover:bg-muted disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setI((n) => Math.min(last, n + 1))}
          disabled={atEnd}
          aria-label="Next slide"
          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-canvas p-2 shadow-card hover:bg-muted disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          ← Back: Build
        </button>

        <div className="flex items-center gap-3 text-xs text-ink-secondary">
          <span>
            Slide {clampedI + 1} / {slides.length} · {label}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            {slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 w-1.5 rounded-full ${idx === clampedI ? "bg-accent" : "bg-line-strong"}`}
              />
            ))}
          </span>
          <span className="text-ink-tertiary">use ← → keys</span>
        </div>

        {/* Export to PowerPoint lives at the end of Preview. */}
        <ExportButton
          companyName={companyName}
          sections={sections}
          sectionsPending={sectionsPending}
          presentationMode={presentationMode}
        />
      </div>
    </div>
  );
}

/** Dark appendix divider slide — mirrors addAppendixDivider in the pptx deck. */
function AppendixDividerSlide() {
  return (
    <div className="flex h-full flex-col justify-center bg-ink px-12 py-10 text-surface">
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full bg-accent-bright" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-bright">
          Appendix
        </span>
      </div>
      <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-surface">
        The numbers behind the case.
      </h2>
      <p className="mt-3 max-w-xl text-sm text-surface/70">
        Scenario modeling and supporting detail — including the conservative and upside
        cases — for the teams who want to pressure-test the plan.
      </p>
    </div>
  );
}
