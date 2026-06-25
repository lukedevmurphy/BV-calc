"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ranged, SectionOutput } from "@/lib/types";
import { READOUT_ORDER } from "@/lib/sections/index";
import { scenarioAppendixSlides } from "@/lib/sections/scenario";
import { planSection } from "@/lib/slide-fit/plan";
import { fmtCurrency } from "@/lib/format";
import SlideView from "../slide-view";
import ExportButton from "../export-button";
import SlidesButton from "../slides-button";
import ScaledSlide from "../scaled-slide";
import { Kicker, btnSecondary } from "../ui";

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
  | { type: "cover" }
  | { type: "section"; section: SectionOutput; fontScale: number; pageNo: number }
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
 * export view of the deck. It carries the SAME deck chrome the .pptx export
 * does: a cover slide, a branded footer with page numbers on every slide, the
 * conservative/base/upside value strip on the executive summary, and a dark
 * appendix divider. MAIN deck is re-sequenced into readout order (value first);
 * the APPENDIX (sections dragged below the divider, plus the auto-generated
 * conservative / upside scenario slides) follows the divider — exactly the order
 * /api/pptx exports.
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

    // Cover first; page numbers run across the section slides only (the cover and
    // the appendix divider carry no number — exactly like the exported deck).
    const out: Slide[] = [{ type: "cover" }];
    let pageNo = 0;
    for (const p of mainFlow) {
      out.push({ type: "section", section: p.section, fontScale: p.fontScale, pageNo: ++pageNo });
    }
    if (appendixFlow.length > 0) {
      out.push({ type: "divider" });
      for (const p of appendixFlow) {
        out.push({ type: "section", section: p.section, fontScale: p.fontScale, pageNo: ++pageNo });
      }
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

  // Only the cover is ever present with no sections; guard the empty deck.
  const hasSections = slides.some((s) => s.type === "section");
  if (!current || !hasSections) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <p className="text-sm text-ink-secondary">
            No sections enabled — go back to Build and enable at least one section.
          </p>
          <button onClick={onBack} className={`${btnSecondary} mt-5`}>
            ← Back: Build
          </button>
        </div>
      </div>
    );
  }

  const atEnd = clampedI === last;
  const label =
    current.type === "cover"
      ? "Cover"
      : current.type === "divider"
        ? "Appendix"
        : current.section.title.split("—")[0].trim();

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <Kicker>Step 03 · Preview</Kicker>
          <h1 className="mt-2.5 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-ink">
            Presentation preview
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
            A what-you-see-is-what-you-export view of the deck — every slide exactly
            as it lands in PowerPoint.
          </p>
        </div>
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
          {confidentialLabel(presentationMode)}
        </span>
      </div>

      <div className="relative">
        {/* 16:9 slide frame — fills the stage like a slide being presented */}
        <div className="w-full overflow-hidden rounded-2xl border border-line bg-canvas shadow-card">
          <ScaledSlide>
            {current.type === "cover" ? (
              <CoverSlide companyName={companyName} presentationMode={presentationMode} />
            ) : current.type === "divider" ? (
              <AppendixDividerSlide presentationMode={presentationMode} />
            ) : (
              <DeckSlide
                section={current.section}
                fontScale={current.fontScale}
                pageNo={current.pageNo}
                presentationMode={presentationMode}
              />
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className={btnSecondary}>
          ← Back: Build
        </button>

        <div className="flex items-center gap-3 text-xs text-ink-secondary">
          <span className="tabular-nums">
            Slide <span className="font-semibold text-ink">{clampedI + 1}</span> /{" "}
            {slides.length} · {label}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            {slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === clampedI ? "w-4 bg-accent" : "w-1.5 bg-line-strong hover:bg-accent-bright"
                }`}
              />
            ))}
          </span>
          <span className="hidden text-ink-tertiary md:inline">use ← → keys</span>
        </div>

        {/* Exports live at the end of Preview: PowerPoint download + Google Slides. */}
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton
            companyName={companyName}
            sections={sections}
            sectionsPending={sectionsPending}
            presentationMode={presentationMode}
          />
          <SlidesButton
            companyName={companyName}
            sections={sections}
            sectionsPending={sectionsPending}
            presentationMode={presentationMode}
          />
        </div>
      </div>
    </div>
  );
}

const confidentialLabel = (mode: "draft" | "client") =>
  mode === "client" ? "Confidential" : "Confidential — Draft for discussion";

/** Branded footer on every content slide — mirrors the pptx master footer
 *  (clay mark · Business Value Services · confidentiality · page number). */
function DeckFooter({
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
        {pageNo != null && <span className="tabular-nums text-ink-secondary">{String(pageNo).padStart(2, "0")}</span>}
      </div>
    </div>
  );
}

/** Conservative · base · upside value strip — mirrors addValueStrip; the exec
 *  summary is the one slide whose job is the full range. */
function ValueStrip({ fig }: { fig: Ranged }) {
  return (
    <div className="mx-12 mb-3 flex items-stretch gap-6 rounded-xl border border-line bg-white px-7 py-4">
      <div className="flex flex-col justify-center">
        <div className="font-serif text-2xl leading-none text-ink-secondary">{fmtCurrency(fig.low)}</div>
        <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
          Conservative
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="font-serif text-lg text-accent">
          {fmtCurrency(fig.base)} · annual value, base case
        </div>
        <div className="mt-2.5 flex w-full max-w-md overflow-hidden rounded-full">
          <span className="h-1.5 flex-1 bg-muted" />
          <span className="h-1.5 flex-1 bg-accent-bright" />
          <span className="h-1.5 flex-1 bg-accent" />
        </div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <div className="font-serif text-2xl leading-none text-ink">{fmtCurrency(fig.high)}</div>
        <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
          Upside
        </div>
      </div>
    </div>
  );
}

/** One content slide with full deck chrome: the SlideView body, the exec-summary
 *  value strip, and the branded footer with page number. */
function DeckSlide({
  section,
  fontScale,
  pageNo,
  presentationMode,
}: {
  section: SectionOutput;
  fontScale: number;
  pageNo: number;
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

/** Title / cover slide — mirrors addTitleSlide in the pptx deck. */
function CoverSlide({
  companyName,
  presentationMode,
}: {
  companyName: string;
  presentationMode: "draft" | "client";
}) {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="relative flex flex-1 flex-col justify-center px-16">
        <span className="absolute right-12 top-10 text-[10px] font-medium uppercase tracking-[0.25em] text-ink-tertiary">
          Executive Overview
        </span>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 rounded-full bg-accent-bright" />
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-accent">
            Enterprise AI · Business Value Proposal
          </span>
        </div>
        <h1 className="mt-6 max-w-3xl font-serif text-6xl font-semibold leading-[1.05] tracking-tight text-ink">
          Making AI the way work gets done.
        </h1>
        <div className="mt-6 font-serif text-3xl italic text-accent">{companyName}</div>
        <div className="mt-12 flex gap-16">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Prepared for</div>
            <div className="mt-1.5 text-base text-ink">{companyName}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Engagement</div>
            <div className="mt-1.5 text-base text-ink">Enterprise AI business case</div>
          </div>
        </div>
      </div>
      <DeckFooter presentationMode={presentationMode} />
    </div>
  );
}

/** Dark appendix divider slide — mirrors addAppendixDivider in the pptx deck,
 *  including its dark-variant footer. */
function AppendixDividerSlide({ presentationMode }: { presentationMode: "draft" | "client" }) {
  return (
    <div className="flex h-full flex-col bg-ink text-surface">
      <div className="flex flex-1 flex-col justify-center px-12">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-accent-bright" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-bright">
            Appendix · Supporting detail
          </span>
        </div>
        <h2 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-surface">
          The numbers behind the case.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-surface/70">
          Scenario modeling and supporting detail — including the conservative and upside
          cases — for the teams who want to pressure-test the plan.
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-surface/15 px-12 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-accent-bright" />
          <span className="text-[11px] font-semibold text-surface/70">Business Value Services</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-surface/50">
          {confidentialLabel(presentationMode)}
        </span>
      </div>
    </div>
  );
}
