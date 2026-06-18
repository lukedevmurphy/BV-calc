"use client";

import type { SectionOutput } from "@/lib/types";
import BandedChart from "./charts/banded-chart";
import SimpleChart from "./charts/simple-chart";

/**
 * The shared slide rendering — a web mirror of the PptxGenJS deck grammar
 * (lib/pptx/slide-builders.ts): clay kicker + serif headline + lede, cream stat
 * cards (serif clay-deep value over an uppercase slate label), bullets on the
 * left / charts-and-table on the right, with a scenario "nugget" in the corner.
 * Used by both the Build cards and the Preview slideshow, so Preview is a
 * what-you-see-is-what-you-export view of the PowerPoint.
 */
export default function SlideView({ section }: { section: SectionOutput }) {
  const hasCharts =
    (section.charts?.length ?? 0) > 0 || (section.bandedCharts?.length ?? 0) > 0;
  const twoCol = (section.bullets?.length ?? 0) > 0 && (hasCharts || !!section.table);

  const visual = (
    <div className="space-y-4">
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

      {/* Stat cards — cream, serif clay-deep value over uppercase slate label */}
      {section.stats && section.stats.length > 0 && (
        <div
          className="mt-4 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(section.stats.length, 4)}, minmax(0, 1fr))` }}
        >
          {section.stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-line bg-canvas px-3 py-2">
              <div className="font-serif text-base font-semibold leading-snug text-accent">
                {s.value}
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Body: bullets left, visual right (mirrors the pptx two-column body) */}
      <div className={`mt-4 grid flex-1 gap-6 ${twoCol ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "grid-cols-1"}`}>
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
        {(hasCharts || section.table) && visual}
      </div>
    </div>
  );
}
