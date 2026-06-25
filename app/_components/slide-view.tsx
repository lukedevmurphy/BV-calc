"use client";

import type { SectionOutput } from "@/lib/types";
import BandedChart from "./charts/banded-chart";
import RankedValueExhibit from "./charts/ranked-value";
import SimpleChart from "./charts/simple-chart";

/**
 * The shared slide rendering — a web mirror of the PptxGenJS deck grammar
 * (lib/pptx/slide-builders.ts): clay kicker + serif headline + lede, cream stat
 * cards (serif clay-deep value over an uppercase slate label), bullets on the
 * left / charts-and-table on the right, with a scenario "nugget" in the corner.
 * Used by both the Build cards and the Preview slideshow, so Preview is a
 * what-you-see-is-what-you-export view of the PowerPoint.
 */
export default function SlideView({
  section,
  fixedLayout = false,
}: {
  section: SectionOutput;
  fixedLayout?: boolean;
}) {
  const hasCharts =
    (section.charts?.length ?? 0) > 0 || (section.bandedCharts?.length ?? 0) > 0;
  const hasRanked = !!section.rankedValue;
  const hasVisual = hasCharts || hasRanked || !!section.table;
  const twoCol = (section.bullets?.length ?? 0) > 0 && hasVisual;

  const visual = (
    <div className="space-y-5">
      {/* Ranked-value exhibit is preferred over charts when present (Value Map /
          Business Value driver bars). */}
      {section.rankedValue ? (
        <RankedValueExhibit data={section.rankedValue} />
      ) : (
        <>
          {/* Charts lead (Part 2): the visual carries the slide, text is secondary. */}
          {section.charts?.map((c) => (
            <div key={c.name}>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                {c.name}
              </div>
              <SimpleChart series={c} />
            </div>
          ))}
          {section.bandedCharts && section.bandedCharts.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                {section.bandedCharts.map((c) => c.name).join(" · ")}
              </div>
              <BandedChart series={section.bandedCharts} />
            </div>
          )}
        </>
      )}
      {section.table && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                {section.table.columns.map((col) => (
                  <th key={col} className="py-2 pr-4 font-medium text-ink-secondary">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-line last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`py-2 pr-4 ${ci === 0 ? "font-medium text-ink" : "text-ink-secondary"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header — clay kicker dash + uppercase section label, nugget top-right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-accent-bright" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            {section.title}
          </span>
        </div>
        {section.scenarioTag && (
          <span className="shrink-0 rounded-full border border-line-strong bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            {section.scenarioTag}
          </span>
        )}
      </div>

      {/* Serif statement headline (the subtitle) + lede (narrative) */}
      <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight tracking-tight text-ink">
        {section.subtitle ?? section.title}
      </h2>
      {section.narrative && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
          {section.narrative}
        </p>
      )}

      {/* Hero stat — one big number alone, with at most two supporting stats
          inline beside it. Demotes the old "up to 6 equal cards" overload. */}
      {section.heroStat ? (
        <div className="mt-5 flex flex-wrap items-end gap-x-12 gap-y-3">
          <div>
            <div className="font-serif text-5xl font-bold leading-none text-accent">
              <ExecutiveStatValue value={section.heroStat.value} />
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">
              {section.heroStat.label}
            </div>
          </div>
          {section.stats?.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-xl font-bold text-ink">{s.value}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Stat cards — cream, serif clay-deep value over uppercase slate label.
           Main slides emit ≤3 (enforced in the section modules); appendix slides
           carry more. */
        section.stats &&
        section.stats.length > 0 && (
          <div
            className={`mt-4 grid gap-3 ${fixedLayout ? "" : "grid-cols-1 sm:grid-cols-2"}`}
            style={
              fixedLayout
                ? {
                    gridTemplateColumns: `repeat(${Math.min(section.stats.length, 4)}, minmax(0, 1fr))`,
                  }
                : undefined
            }
          >
            {section.stats.map((s) => (
              <div
                key={s.label}
                className={`rounded-lg border border-line px-3.5 py-2.5 ${fixedLayout ? "bg-surface" : "bg-canvas"}`}
              >
                <div className="font-serif text-2xl leading-tight text-accent">
                  {section.kind === "executive_summary" ? (
                    <ExecutiveStatValue value={s.value} />
                  ) : (
                    <span className="font-bold">{s.value}</span>
                  )}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Body: bullets left, visual right (mirrors the pptx two-column body) */}
      <div
        className={`mt-6 grid flex-1 gap-6 ${
          twoCol
            ? fixedLayout
              ? "grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
              : "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
            : "grid-cols-1"
        }`}
      >
        {section.bullets && section.bullets.length > 0 && (
          <ul className="space-y-2">
            {section.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-secondary">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {hasVisual && visual}
      </div>

      {/* Clickable sources (e.g. an Anthropic customer-story URL). */}
      {section.links && section.links.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {section.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-accent underline-offset-2 hover:underline"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}

      {/* Footnote — a quiet caveat/source line pinned at the slide's bottom edge
          (mirrors the pptx footnote). The flex-1 body above pushes it down. */}
      {section.footnote && (
        <p className="mt-3 border-t border-line pt-2 text-[11px] italic leading-snug text-ink-tertiary">
          {section.footnote}
        </p>
      )}
    </div>
  );
}

function ExecutiveStatValue({ value }: { value: string }) {
  const rangeStart = value.indexOf(" (");
  if (rangeStart < 0) return <span className="font-bold">{value}</span>;
  return (
    <>
      <span className="font-bold">{value.slice(0, rangeStart)}</span>
      <span className="text-[0.5em] font-normal text-ink-secondary">{value.slice(rangeStart)}</span>
    </>
  );
}
