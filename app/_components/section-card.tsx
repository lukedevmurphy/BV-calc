"use client";

import type { SectionOutput } from "@/lib/types";
import BandedChart from "./charts/banded-chart";
import SimpleChart from "./charts/simple-chart";

/**
 * The web consumer of SectionOutput. Renders on present fields, not on kind —
 * the same object drives the PPTX exporter, so anything shown here must come
 * from the structured fields, never ad-hoc per-section markup.
 */
export default function SectionCard({ section }: { section: SectionOutput }) {
  return (
    <article
      className="rounded-xl border border-line bg-surface p-6 shadow-card"
      data-section={section.kind}
    >
      <header>
        <h2 className="text-xl font-semibold">{section.title}</h2>
        {section.subtitle && (
          <p className="mt-1 text-sm text-ink-secondary">{section.subtitle}</p>
        )}
      </header>

      {section.stats && section.stats.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {section.stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                {s.label}
              </div>
              <div className="mt-0.5 text-sm font-semibold leading-snug">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {section.narrative && (
        <p className="mt-3 text-sm italic text-ink-secondary">{section.narrative}</p>
      )}

      {section.table && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                {section.table.columns.map((c) => (
                  <th key={c} className="py-2 pr-4 font-medium text-ink-secondary">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-line last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 pr-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.charts?.map((c) => (
        <div key={c.name} className="mt-4">
          <div className="mb-1 text-xs font-medium text-ink-tertiary">{c.name}</div>
          <SimpleChart series={c} />
        </div>
      ))}

      {section.bandedCharts && section.bandedCharts.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium text-ink-tertiary">
            {section.bandedCharts.map((c) => c.name).join(" · ")}
          </div>
          <BandedChart series={section.bandedCharts} />
        </div>
      )}

      {(section.speakerNotes || section.assumptionsUsed) && (
        <details className="mt-4 text-xs text-ink-tertiary">
          <summary className="cursor-pointer select-none font-medium">
            Speaker notes & assumptions
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
