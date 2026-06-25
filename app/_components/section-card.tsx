"use client";

import type { SectionOutput } from "@/lib/types";
import ScaledSlide from "./scaled-slide";
import { DeckSectionSlide } from "./deck-slide";

/**
 * Build-screen card: renders the section in the SAME framed deck slide the
 * Preview uses (16:9 ivory canvas, fixed-layout body, branded footer) so the
 * Build view is a true preview — what you build is what you'll present. Wrapped
 * in collapse chrome + a speaker-notes disclosure; collapsing is pure preview
 * state and never touches the section payload.
 */
export default function SectionCard({
  section,
  collapsed = false,
  onToggleCollapse,
}: {
  section: SectionOutput;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  if (collapsed) {
    return (
      <article data-section={section.kind}>
        <header className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-3 shadow-card">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-accent-bright" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              {section.title}
            </span>
          </div>
          {onToggleCollapse && <CollapseButton collapsed onClick={onToggleCollapse} />}
        </header>
      </article>
    );
  }

  return (
    <article data-section={section.kind}>
      <div className="relative">
        {onToggleCollapse && (
          <div className="absolute right-2 top-2 z-10">
            <CollapseButton collapsed={false} onClick={onToggleCollapse} />
          </div>
        )}
        {/* Same framed 16:9 deck slide as the Preview, thicker bordered. */}
        <div className="overflow-hidden rounded-2xl border-2 border-line-strong bg-canvas shadow-card">
          <ScaledSlide>
            <DeckSectionSlide section={section} presentationMode="draft" />
          </ScaledSlide>
        </div>
      </div>

      {(section.speakerNotes || section.assumptionsUsed) && (
        <details className="mt-3 px-1 text-xs text-ink-tertiary">
          <summary className="cursor-pointer select-none font-medium">
            Speaker notes &amp; assumptions
          </summary>
          {section.speakerNotes && (
            <p className="mt-2 leading-relaxed">{section.speakerNotes}</p>
          )}
          {section.assumptionsUsed && section.assumptionsUsed.length > 0 && (
            <p className="mt-2">
              <span className="font-medium">Assumptions used:</span>{" "}
              {section.assumptionsUsed.join("; ")}
            </p>
          )}
        </details>
      )}
    </article>
  );
}

function CollapseButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Expand section" : "Collapse section"}
      aria-expanded={!collapsed}
      className="shrink-0 rounded-md border border-line bg-surface/90 p-1 text-ink-secondary shadow-sm backdrop-blur hover:bg-muted"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
      >
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
