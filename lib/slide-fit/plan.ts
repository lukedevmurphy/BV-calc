// ─────────────────────────────────────────────────────────────────────────────
// The SLIDE-FIT engine. Given one SectionOutput, decide how to make it fit a
// 16:9 pptx slide and return the slide(s) to render. Pure + deterministic, so
// the pptx export and the web preview produce IDENTICAL slide structures.
//
// Escalation ladder (in order; stop at the first that fits):
//   1. FIT       — content fits at full size → one slide.
//   2. COMPACT   — slightly over → shrink body fonts to the largest scale that
//                  fits, down to a readable floor (MIN_FONT_SCALE).
//   3. SUMMARIZE — still over and the slide has a long TABLE (a list: use cases /
//                  drivers) → keep the top KEEP_ROWS + a rollup line on the main
//                  slide, move the FULL table to an appendix slide.
//   4. SPLIT     — still over and the overflow is core bullets → split across
//                  "<Section> (1 of 2)" / "(2 of 2)".
//
// Prefer compaction over summarize, and summarize-to-appendix over splitting:
// the main flow only splits when the content is genuinely core and can't shrink
// or be moved to the appendix.
// ─────────────────────────────────────────────────────────────────────────────

import type { SectionOutput, TableData } from "@/lib/types";
import { fmtCurrency } from "@/lib/format";
import {
  KEEP_ROWS,
  MIN_FONT_SCALE,
  fits,
  largestScaleThatFits,
} from "./metrics";

export type FitDecision = "fit" | "compact" | "summarize" | "split";

export interface PlannedSlide {
  /** The (possibly transformed) section to render. */
  section: SectionOutput;
  /** Body-font multiplier to apply (1 = none; < 1 = compacted). */
  fontScale: number;
  /** Final lane: main deck flow, or the appendix (after the divider). */
  placement: "main" | "appendix";
  /** Which rung of the ladder produced this slide (for reporting/labels). */
  decision: FitDecision;
}

/** Plan one section into one or more slides, applying the escalation ladder. */
export function planSection(s: SectionOutput): PlannedSlide[] {
  const placement: "main" | "appendix" = s.appendix ? "appendix" : "main";

  // 1. FITS as-is.
  if (fits(s, 1)) {
    return [{ section: s, fontScale: 1, placement, decision: "fit" }];
  }

  // 2. COMPACT — shrink to the largest readable scale that fits.
  const scale = largestScaleThatFits(s);
  if (scale !== null) {
    return [{ section: s, fontScale: scale, placement, decision: "compact" }];
  }

  // 3. SUMMARIZE — a table is detail that can move to the appendix. A long
  //    table keeps its top rows + a rollup on the main slide; a short table
  //    that's only over because it competes with a chart moves off wholesale
  //    (keeping the headline chart on the main slide). Either way the full
  //    table lands in the appendix — preferred over splitting the main flow.
  if (s.table) {
    const { main, appendix } = summarizeTable(s);
    const mainScale = largestScaleThatFits(main) ?? MIN_FONT_SCALE;
    return [
      { section: main, fontScale: mainScale, placement, decision: "summarize" },
      { section: appendix, fontScale: 1, placement: "appendix", decision: "summarize" },
    ];
  }

  // 4. SPLIT — genuinely-overlong core bullets with no table to offload.
  if (s.bullets && s.bullets.length > 2) {
    return splitBullets(s).map((part) => ({
      section: part,
      fontScale: largestScaleThatFits(part) ?? MIN_FONT_SCALE,
      placement,
      decision: "split" as const,
    }));
  }

  // Last resort: render at the readable floor (better than nothing; the bounds
  // check will flag it if it still genuinely overflows).
  return [{ section: s, fontScale: MIN_FONT_SCALE, placement, decision: "compact" }];
}

// ── Transforms ───────────────────────────────────────────────────────────────

/** "$2.4M" / "$340K" / "$1,234" → number (the FIRST currency token); null if none. */
function parseFirstCurrency(cell: string): number | null {
  const m = cell.match(/\$([\d,.]+)\s*([MKB])?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult = { b: 1e9, m: 1e6, k: 1e3 }[(m[2] ?? "").toLowerCase()] ?? 1;
  return n * mult;
}

/**
 * Move a slide's table detail to an appendix slide. Two shapes:
 *  • LONG table (rows > KEEP_ROWS): keep the top KEEP_ROWS + a rollup row on the
 *    main slide ("+ N more — $X total" when the value column is currency).
 *  • SHORT table only over because it competes with a chart for the right
 *    column: drop it off the main slide wholesale (keeping the chart) and note
 *    the move in a bullet.
 * Either way the FULL table renders on the appendix slide.
 */
function summarizeTable(s: SectionOutput): { main: SectionOutput; appendix: SectionOutput } {
  const table = s.table as TableData;
  const noun = (table.columns[0] ?? "row").toLowerCase();
  const lastCol = table.columns.length - 1;

  let main: SectionOutput;
  if (table.rows.length > KEEP_ROWS) {
    const hidden = table.rows.slice(KEEP_ROWS);
    const parsed = hidden.map((r) => parseFirstCurrency(String(r[lastCol] ?? "")));
    const allCurrency = parsed.length > 0 && parsed.every((v) => v !== null);
    const total = parsed.reduce((acc: number, v) => acc + (v ?? 0), 0);
    const rollup: (string | number)[] = table.columns.map((_, ci) => {
      if (ci === 0) return `+ ${hidden.length} more (see appendix)`;
      if (ci === lastCol && allCurrency && total > 0) return `${fmtCurrency(total)} total`;
      return "…";
    });
    main = { ...s, table: { ...table, rows: [...table.rows.slice(0, KEEP_ROWS), rollup] } };
  } else {
    const note = `Full ${noun} breakdown (${table.rows.length}) in the appendix`;
    main = { ...s, table: undefined, bullets: [...(s.bullets ?? []), note] };
  }

  const appendix: SectionOutput = {
    id: `${s.id}_full`,
    kind: s.kind,
    title: s.title,
    subtitle: `${s.title} — all ${table.rows.length} ${noun}s`,
    table,
    speakerNotes: s.speakerNotes,
    order: s.order,
    enabled: true,
    appendix: true,
  };

  return { main, appendix };
}

/** Split core bullets across two slides; slide 1 keeps stats/visual, slide 2 is
 *  the remaining bullets only. Titled "(1 of 2)" / "(2 of 2)". */
function splitBullets(s: SectionOutput): SectionOutput[] {
  const bullets = s.bullets ?? [];
  const mid = Math.ceil(bullets.length / 2);
  const part1: SectionOutput = {
    ...s,
    title: `${s.title} (1 of 2)`,
    bullets: bullets.slice(0, mid),
  };
  const part2: SectionOutput = {
    ...s,
    id: `${s.id}_2`,
    title: `${s.title} (2 of 2)`,
    bullets: bullets.slice(mid),
    stats: undefined,
    table: undefined,
    charts: undefined,
    bandedCharts: undefined,
    narrative: undefined,
    scenarioTag: undefined,
  };
  return [part1, part2];
}
