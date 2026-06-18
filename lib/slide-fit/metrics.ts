// ─────────────────────────────────────────────────────────────────────────────
// Slide geometry + rendered-height ESTIMATORS — the single source of truth for
// "does this content fit a 16:9 pptx slide". Pure (no PptxGenJS) so BOTH the
// export (lib/pptx/slide-builders.ts) and the web preview can share the exact
// same fit decisions, and scripts/check-pptx.ts can assert against the same
// numbers. The pptx builder lays content out using THESE functions, so the
// estimate, the render, and the regression check never disagree.
//
// Estimates are intentionally conservative (slightly over-count) — over-counting
// triggers compaction a touch early, which is safe; under-counting would let
// content bleed past the frame, which is the bug we're killing.
// ─────────────────────────────────────────────────────────────────────────────

import type { SectionOutput, TableData } from "@/lib/types";

// ── Geometry (inches; 13.33×7.5 wide layout) ────────────────────────────────
export const PAGE_W = 13.33;
export const PAGE_H = 7.5;
export const MARGIN = 0.72;
export const CONTENT_W = PAGE_W - MARGIN * 2;
export const CONTENT_BOTTOM = PAGE_H - 0.62; // clear of the master footer rule
export const COL_GAP = 0.4;
export const LEFT_COL_W = 5.2;
/** Right (visual) column width when a slide is two-column. */
export const VIS_W = CONTENT_W - LEFT_COL_W - COL_GAP;

// ── Base font sizes (pt). Compaction multiplies the BODY ones by a scale; the
//    header/kicker/page-number stay fixed so titles never look shrunken. ──────
export const HEADLINE_PT = 27;
export const LEDE_PT = 12.5;
export const BULLET_PT = 11.5;
export const STAT_VALUE_PT = 12.5;
export const TABLE_PT = 10;

// ── Fixed block sizes ───────────────────────────────────────────────────────
export const CARD_H = 0.98; // stat card height
export const STAT_ROW_EXTRA = 0.22; // gap below the stats row
export const STRIP_H = 1.12; // exec-summary value strip
export const STRIP_PAD = 0.18; // gap above the value strip
export const CHART_MIN = 1.4; // a chart needs at least this much height or it's dropped
export const CELL_PAD_H = 0.14;

/** Readable floor for compaction — body fonts never scale below this. At 0.8,
 *  the 11.5pt bullet → 9.2pt and the 10pt table → 8pt: tight but legible. */
export const MIN_FONT_SCALE = 0.8;
/** Rows kept on the main slide when a table is summarized to an appendix. */
export const KEEP_ROWS = 4;

// ── Text metrics (pt → inches at 72pt/in; conservative) ─────────────────────
export const lineH = (pt: number) => (1.42 * pt) / 72;
export const charsPerLine = (widthIn: number, pt: number) =>
  Math.max(8, Math.floor(widthIn / (0.0074 * pt)));

export function textLines(text: string, widthIn: number, pt: number): number {
  const cpl = charsPerLine(widthIn, pt);
  return text
    .split("\n")
    .reduce((acc, ln) => acc + Math.max(1, Math.ceil(ln.length / cpl)), 0);
}

export function textBlockH(text: string, widthIn: number, pt: number): number {
  return textLines(text, widthIn, pt) * lineH(pt) + 0.08;
}

export function bulletsH(bullets: string[], widthIn: number, pt: number): number {
  const para = 0.11;
  const usable = widthIn - 0.25;
  return (
    bullets.reduce((acc, b) => acc + textLines(b, usable, pt) * lineH(pt) + para, 0) + 0.12
  );
}

export function tableColWidths(cols: number, totalW: number): number[] {
  const weights =
    cols === 2 ? [0.45, 0.55]
    : cols === 3 ? [0.4, 0.3, 0.3]
    : cols === 4 ? [0.34, 0.22, 0.22, 0.22]
    : Array.from({ length: cols }, () => 1 / cols);
  return weights.map((w) => w * totalW);
}

export function tableH(table: TableData, totalW: number, pt: number = TABLE_PT): number {
  const colW = tableColWidths(table.columns.length, totalW);
  const rowH = (cells: (string | number)[]) =>
    Math.max(
      ...cells.map((c, i) =>
        textLines(String(c), Math.max(colW[i] - 0.15, 0.3), pt),
      ),
    ) *
      lineH(pt) +
    CELL_PAD_H;
  return rowH(table.columns) + table.rows.reduce((acc, r) => acc + rowH(r), 0) + 0.1;
}

// ── Section-level layout estimators ─────────────────────────────────────────

/** Y where the body starts: kicker band + serif headline + optional lede.
 *  Replicates addHeader() in slide-builders.ts EXACTLY (header is unscaled). */
export function headerBottom(s: SectionOutput): number {
  const headline = s.subtitle ?? s.title;
  let y = 0.55 + 0.42; // kicker band
  const headH = Math.min(textBlockH(headline, CONTENT_W, HEADLINE_PT) * 1.06, 1.35);
  y += headH + 0.04;
  if (s.narrative) {
    const ledeH = Math.min(textBlockH(s.narrative, CONTENT_W, LEDE_PT), 0.62);
    y += ledeH + 0.06;
  }
  return y + 0.12;
}

/** Height the stats row consumes (cards are fixed height; the value text inside
 *  shrink-fits). 0 when there are no stats. */
export function statsRowH(s: SectionOutput): number {
  return s.stats && s.stats.length > 0 ? CARD_H + STAT_ROW_EXTRA : 0;
}

export const hasVisual = (s: SectionOutput): boolean =>
  Boolean(s.table) || (s.charts?.length ?? 0) > 0 || (s.bandedCharts?.length ?? 0) > 0;

export const isTwoCol = (s: SectionOutput): boolean =>
  Boolean(s.bullets?.length) && hasVisual(s);

const hasChart = (s: SectionOutput): boolean =>
  (s.charts?.length ?? 0) > 0 || (s.bandedCharts?.length ?? 0) > 0;

/** Vertical space available for the body, below the header + stats row, above
 *  the footer (and the exec-summary value strip when present). */
export function bodyAvailable(s: SectionOutput): number {
  const isExec = s.kind === "executive_summary";
  const top = headerBottom(s) + statsRowH(s);
  const bottom = isExec ? CONTENT_BOTTOM - STRIP_H - STRIP_PAD : CONTENT_BOTTOM;
  return bottom - top;
}

/**
 * Height the body's fixed (non-elastic) content REQUIRES at a given font scale,
 * mirroring the builder's column layout. Charts are elastic (they take the
 * remainder) but are reserved CHART_MIN so they're never silently dropped.
 */
export function requiredBodyH(s: SectionOutput, scale = 1): number {
  const bullets = s.bullets ?? [];
  const chartReserve = hasChart(s) ? CHART_MIN : 0;
  if (isTwoCol(s)) {
    const left = bullets.length ? bulletsH(bullets, LEFT_COL_W, BULLET_PT * scale) : 0;
    const right = (s.table ? tableH(s.table, VIS_W, TABLE_PT * scale) : 0) + chartReserve;
    return Math.max(left, right);
  }
  if (bullets.length) {
    return bulletsH(bullets, CONTENT_W, BULLET_PT * scale);
  }
  // visual-only
  return (s.table ? tableH(s.table, CONTENT_W, TABLE_PT * scale) : 0) + chartReserve;
}

/** Does the section fit on one slide at this font scale? */
export function fits(s: SectionOutput, scale = 1): boolean {
  return requiredBodyH(s, scale) <= bodyAvailable(s) + 0.001;
}

/** Largest scale in [MIN_FONT_SCALE, 1] (stepping down) at which the section
 *  fits, or null if it never fits even at the readable floor. */
export function largestScaleThatFits(s: SectionOutput): number | null {
  for (let scale = 1; scale >= MIN_FONT_SCALE - 1e-9; scale -= 0.02) {
    if (fits(s, scale)) return Math.round(scale * 100) / 100;
  }
  return null;
}
