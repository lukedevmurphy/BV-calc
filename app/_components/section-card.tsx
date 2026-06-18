"use client";

import type { SectionOutput } from "@/lib/types";
import SlideView from "./slide-view";

/**
 * Build-screen card: the shared SlideView (a faithful mirror of the exported
 * PowerPoint) wrapped in collapse chrome + speaker-notes disclosure. Collapsing
 * is pure preview state — it never touches the section payload.
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
  return (
    <article
      className="rounded-xl border border-line bg-surface p-6 shadow-card"
      data-section={section.kind}
    >
      {collapsed ? (
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-accent-bright" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              {section.title}
            </span>
          </div>
          {onToggleCollapse && (
            <CollapseButton collapsed onClick={onToggleCollapse} />
          )}
        </header>
      ) : (
        <div className="relative">
          {onToggleCollapse && (
            <div className="absolute right-0 top-0 z-10">
              <CollapseButton collapsed={false} onClick={onToggleCollapse} />
            </div>
          )}
          <SlideView section={section} />

          {(section.speakerNotes || section.assumptionsUsed) && (
            <details className="mt-4 border-t border-line pt-3 text-xs text-ink-tertiary">
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
        </div>
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
      className="shrink-0 rounded p-1 text-ink-tertiary hover:bg-muted"
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
