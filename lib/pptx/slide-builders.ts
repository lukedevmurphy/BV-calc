// Server-only: SectionOutput → PptxGenJS slides. Imported exclusively by
// app/api/pptx/route.ts so PptxGenJS never enters the client bundle.
//
// Design system: the "Executive Business Case" deck template — ivory canvas,
// cream cards, warm ink, Anthropic clay accent, editorial serif headlines
// (Georgia as the PowerPoint-safe Newsreader/Tiempos stand-in; Calibri body).
// Slide grammar is uniform for predictability:
//   kicker (clay dash + uppercase section label) · page number
//   serif statement headline (the section's subtitle)
//   optional lede (the section's narrative)
//   stats cards / bullets / table / charts
//   branded footer (master): rule · mark · Business Value Services · CONFIDENTIAL
//
// LAYOUT INVARIANT: no two shapes on a slide may overlap. Text and table
// heights are estimated conservatively before placement, charts receive the
// REMAINING space (never a fixed size), and every text box carries
// fit:"shrink". scripts/check-pptx.ts parses the slide XML and asserts
// pairwise non-overlap of all shapes (containment allowed for card layering).

import type PptxGenJS from "pptxgenjs";
import type {
  BandedSeries,
  ChartSeries,
  Ranged,
  RankedValue,
  SectionOutput,
  TableData,
} from "@/lib/types";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import {
  PAGE_W,
  PAGE_H,
  MARGIN,
  CONTENT_W,
  CONTENT_BOTTOM,
  COL_GAP,
  LEFT_COL_W,
  CARD_H,
  STAT_ROW_EXTRA,
  HERO_BLOCK_H,
  RANKED_HEADER_H,
  RANKED_ROW_H,
  RANKED_ROW_GAP,
  RANKED_TOTAL_H,
  STRIP_H,
  STRIP_PAD,
  FOOTNOTE_H,
  CHART_MIN,
  TABLE_PT,
  BULLET_PT,
  STAT_VALUE_PT,
  bulletsH,
  tableH,
  rankedValueH,
  tableColWidths,
  textBlockH,
} from "@/lib/slide-fit/metrics";

// ── Palette (mirrors app/globals.css / the HTML template) ──────────────────
const IVORY = "FAF9F5";
const CREAM = "F0EDE4";
const CREAM2 = "EAE6DA";
const CLAY = "CC785C";
const CLAY_DEEP = "A8492A";
const INK = "1A1915";
const INK_SOFT = "2D2B25";
const SLATE = "6F6D63";
const SLATE2 = "92907F";
const LINE = "E2DECF";
const LINE2 = "D3CEBC";
const DARK_FOOT_LINE = "3A382F";

const SERIF = "Georgia";
const SANS = "Calibri";

// value = sage, cost = clay, net = gold (same semantics as the web)
const SERIES_HUES = [
  { base: "7E8B6B", edge: "C2CBB2" },
  { base: "CC785C", edge: "ECC9BA" },
  { base: "C99A3F", edge: "E8D6AC" },
];

// ── Master slide (footer brand) ─────────────────────────────────────────────
export const MASTER = "BVC";

export function defineBrandMaster(
  pptx: PptxGenJS,
  presentationMode: "draft" | "client" = "draft",
): void {
  const footY = PAGE_H - 0.46;
  const footerLabel =
    presentationMode === "client" ? "CONFIDENTIAL" : "CONFIDENTIAL — DRAFT FOR DISCUSSION";
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: IVORY },
    objects: [
      {
        rect: {
          x: MARGIN,
          y: footY - 0.1,
          w: CONTENT_W,
          h: 0.009,
          fill: { color: LINE },
        },
      },
      {
        rect: {
          x: MARGIN,
          y: footY + 0.075,
          w: 0.11,
          h: 0.11,
          fill: { color: CLAY },
          rectRadius: 0.055,
        },
      },
      {
        text: {
          text: "Business Value Services",
          options: {
            x: MARGIN + 0.18,
            y: footY,
            w: 4,
            h: 0.26,
            fontSize: 8.5,
            bold: true,
            fontFace: SANS,
            color: SLATE,
          },
        },
      },
      {
        text: {
          text: footerLabel,
          options: {
            x: PAGE_W - MARGIN - 4,
            y: footY,
            w: 4,
            h: 0.26,
            fontSize: 7.5,
            fontFace: SANS,
            color: SLATE2,
            align: "right",
            charSpacing: 2,
          },
        },
      },
    ],
  });
}

// ── Shared header: kicker · page number · serif headline · lede ────────────
function addHeader(
  slide: PptxGenJS.Slide,
  kicker: string,
  pageNo: number,
  headline: string,
  lede: string | undefined,
  dark = false,
  cornerTag?: string,
): number {
  let y = 0.55;

  slide.addShape("rect", {
    x: MARGIN,
    y: y + 0.105,
    w: 0.3,
    h: 0.024,
    fill: { color: CLAY },
    line: { type: "none" },
  });
  // A scenario "nugget" pill ("Base case" etc.) sits just LEFT of the page
  // number; the kicker shrinks to leave room so no shapes overlap.
  const nugW = 1.95;
  const nugX = PAGE_W - MARGIN - 0.82 - nugW; // 0.82 = page-number width + gap
  if (cornerTag) {
    slide.addShape("roundRect", {
      x: nugX,
      y: y - 0.02,
      w: nugW,
      h: 0.34,
      rectRadius: 0.17,
      fill: { color: dark ? "26241D" : CREAM2 },
      line: { color: dark ? DARK_FOOT_LINE : LINE2, width: 0.75 },
    });
    slide.addText(cornerTag.toUpperCase(), {
      x: nugX,
      y: y - 0.02,
      w: nugW,
      h: 0.34,
      fontSize: 8,
      bold: true,
      fontFace: SANS,
      color: dark ? CLAY : CLAY_DEEP,
      align: "center",
      valign: "middle",
      charSpacing: 2,
      fit: "shrink",
    });
  }
  slide.addText(kicker.toUpperCase(), {
    x: MARGIN + 0.42,
    y,
    w: cornerTag ? nugX - (MARGIN + 0.42) - 0.2 : CONTENT_W - 1.5,
    h: 0.26,
    fontSize: 10.5,
    bold: true,
    fontFace: SANS,
    color: dark ? CLAY : CLAY_DEEP,
    charSpacing: 3,
    fit: "shrink",
  });
  slide.addText(String(pageNo).padStart(2, "0"), {
    x: PAGE_W - MARGIN - 0.7,
    y,
    w: 0.7,
    h: 0.26,
    fontSize: 10,
    fontFace: SANS,
    color: SLATE2,
    align: "right",
    charSpacing: 2,
  });
  y += 0.42;

  const headH = Math.min(textBlockH(headline, CONTENT_W, 27) * 1.06, 1.35);
  slide.addText(headline, {
    x: MARGIN,
    y,
    w: CONTENT_W,
    h: headH,
    fontSize: 27,
    bold: false,
    fontFace: SERIF,
    color: dark ? CREAM : INK,
    fit: "shrink",
    valign: "top",
  });
  y += headH + 0.04;

  if (lede) {
    const ledeH = Math.min(textBlockH(lede, CONTENT_W, 12.5), 0.62);
    slide.addText(lede, {
      x: MARGIN,
      y,
      w: CONTENT_W,
      h: ledeH,
      fontSize: 12.5,
      fontFace: SANS,
      color: dark ? "CFC9BB" : SLATE,
      fit: "shrink",
      valign: "top",
    });
    y += ledeH + 0.06;
  }

  return y + 0.12;
}

// ── Section slide ───────────────────────────────────────────────────────────
export interface SectionSlideOpts {
  pageNo: number;
  /** Set for appendix sections — renders the "APPENDIX A{n} · …" kicker. */
  appendixIndex?: number;
  /** Body-font compaction multiplier from the slide-fit engine (1 = none).
   *  Scales bullets, table and stat-value text within a readable floor so a
   *  slightly-over slide fits without splitting. */
  fontScale?: number;
}

export function addSectionSlide(
  pptx: PptxGenJS,
  s: SectionOutput,
  opts: SectionSlideOpts,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  const scale = opts.fontScale ?? 1;

  const kicker = opts.appendixIndex
    ? `Appendix A${opts.appendixIndex} · ${s.title}`
    : s.title;
  let y = addHeader(
    slide,
    kicker,
    opts.pageNo,
    s.subtitle ?? s.title,
    s.narrative,
    false,
    s.scenarioTag,
  );

  // Exec-summary value strip is reserved at the bottom before laying out the
  // body, so the budget math keeps everything collision-free.
  const valueFig =
    s.kind === "executive_summary" ? s.rangedFigures?.annualValueFinalYear : undefined;
  // A footnote (e.g. the Value Map's "confirm vs 10-K" caveat) is pinned at the
  // very bottom; reserve its height so the body never collides with it.
  const footnoteH = s.footnote ? FOOTNOTE_H : 0;
  const bodyBottom =
    (valueFig ? CONTENT_BOTTOM - STRIP_H - STRIP_PAD : CONTENT_BOTTOM) - footnoteH;

  // Hero stat — one big number alone, with up to two supporting stats inline.
  if (s.heroStat) {
    const hero = s.heroStat;
    const rangeStart = hero.value.indexOf(" (");
    const heroRuns =
      rangeStart >= 0
        ? [
            { text: hero.value.slice(0, rangeStart), options: { fontSize: 38 * scale, fontFace: SERIF, color: CLAY_DEEP, bold: true } },
            { text: hero.value.slice(rangeStart), options: { fontSize: 17 * scale, fontFace: SERIF, color: SLATE, bold: false } },
          ]
        : [{ text: hero.value, options: { fontSize: 38 * scale, fontFace: SERIF, color: CLAY_DEEP, bold: true } }];
    const heroW = 4.6;
    slide.addText(
      [
        ...heroRuns,
        { text: "\n" + hero.label.toUpperCase(), options: { fontSize: 8, fontFace: SANS, color: SLATE, charSpacing: 1.5 } },
      ],
      { x: MARGIN, y, w: heroW, h: HERO_BLOCK_H, valign: "top", wrap: true, fit: "shrink" },
    );
    // Sections that set a hero stat emit ≤2 supporting stats (they sit inline
    // beside the hero). Render all of them — the seam asserts every stat survives.
    const support = s.stats ?? [];
    const supW = 2.4;
    support.forEach((stat, i) => {
      const sx = MARGIN + heroW + 0.3 + i * (supW + 0.3);
      slide.addText(
        [
          { text: stat.value, options: { fontSize: 17 * scale, fontFace: SERIF, color: INK, bold: true } },
          { text: "\n" + stat.label.toUpperCase(), options: { fontSize: 7.5, fontFace: SANS, color: SLATE, charSpacing: 1.5 } },
        ],
        { x: sx, y: y + 0.16, w: supW, h: HERO_BLOCK_H - 0.16, valign: "top", wrap: true, fit: "shrink" },
      );
    });
    y += HERO_BLOCK_H + STAT_ROW_EXTRA;
  } else if (s.stats && s.stats.length > 0) {
    // Stats row — cream cards, big-ish serif clay-deep value, label beneath. Main
    // slides emit ≤3 (the "fewer, bigger" principle is enforced in the section
    // modules); appendix slides legitimately carry more. Render all so the seam
    // (every stat verbatim) holds.
    const stats = s.stats;
    const gap = 0.18;
    const w = (CONTENT_W - gap * (stats.length - 1)) / stats.length;
    stats.forEach((stat, i) => {
      const x = MARGIN + i * (w + gap);
      const rangeStart = s.kind === "executive_summary" ? stat.value.indexOf(" (") : -1;
      const valueRuns = rangeStart >= 0
        ? [
            {
              text: stat.value.slice(0, rangeStart),
              options: { fontSize: STAT_VALUE_PT * scale, fontFace: SERIF, color: CLAY_DEEP, bold: true },
            },
            {
              text: stat.value.slice(rangeStart),
              options: { fontSize: STAT_VALUE_PT * scale, fontFace: SERIF, color: SLATE, bold: false, breakLine: true },
            },
          ]
        : [
            {
              text: stat.value,
              options: { fontSize: STAT_VALUE_PT * scale, fontFace: SERIF, color: CLAY_DEEP, bold: true, breakLine: true },
            },
          ];
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h: CARD_H,
        rectRadius: 0.07,
        fill: { color: CREAM },
        line: { color: LINE, width: 0.75 },
      });
      slide.addText(
        [
          ...valueRuns,
          {
            text: stat.label.toUpperCase(),
            options: {
              fontSize: 7,
              fontFace: SANS,
              color: SLATE,
              charSpacing: 1.5,
            },
          },
        ],
        {
          x: x + 0.14,
          y: y + 0.1,
          w: w - 0.28,
          h: CARD_H - 0.2,
          valign: "top",
          wrap: true,
          fit: "shrink",
        },
      );
    });
    y += CARD_H + STAT_ROW_EXTRA;
  }

  const hasVisual =
    Boolean(s.table) ||
    Boolean(s.rankedValue) ||
    (s.charts?.length ?? 0) > 0 ||
    (s.bandedCharts?.length ?? 0) > 0;
  const twoCol = Boolean(s.bullets?.length) && hasVisual;
  const bodyTop = y;

  const textW = twoCol ? LEFT_COL_W : CONTENT_W;
  const visX = twoCol ? MARGIN + LEFT_COL_W + COL_GAP : MARGIN;
  const visW = twoCol ? CONTENT_W - LEFT_COL_W - COL_GAP : CONTENT_W;

  // Boxes are placed at their ESTIMATED NATURAL height (no clamping to the
  // frame): the slide-fit engine guarantees the content fits at `scale`, so the
  // natural height stays within bodyBottom — and if the estimate is ever wrong,
  // the box visibly exceeds the frame and scripts/check-pptx flags it (rather
  // than the old clamp silently hiding overflow behind shrink-to-nothing).
  // wrap + fit remain as a per-box safety net for long unbreakable tokens.
  let ty = bodyTop;
  if (s.bullets && s.bullets.length > 0) {
    const h = bulletsH(s.bullets, textW, BULLET_PT * scale);
    slide.addText(
      s.bullets.map((b) => ({
        text: b,
        options: {
          bullet: { code: "2022", indent: 10, color: CLAY },
          breakLine: true,
          paraSpaceAfter: 9 * scale,
        },
      })),
      {
        x: MARGIN,
        y: ty,
        w: textW,
        h,
        fontSize: BULLET_PT * scale,
        fontFace: SANS,
        color: INK_SOFT,
        valign: "top",
        wrap: true,
        fit: "shrink",
        lineSpacingMultiple: scale < 1 ? 1.06 : 1.14,
      },
    );
    ty += h + 0.12;
  }

  let vy = twoCol ? bodyTop : ty;

  if (s.table) {
    const th = tableH(s.table, visW, TABLE_PT * scale);
    addOpenTable(slide, s.table, visX, vy, visW, TABLE_PT * scale);
    vy += th + 0.2;
  }

  // Ranked-value exhibit — fixed height (known row count), placed before the
  // elastic chart logic so it never fights charts for the remainder.
  if (s.rankedValue) {
    const rh = rankedValueH(s);
    addRankedValue(slide, s.rankedValue, visX, vy, visW, rh, scale);
    vy += rh + 0.2;
  }

  // Charts take the REMAINDER of whichever column has the most room.
  const chartSlot = (): { x: number; y: number; w: number; h: number } | null => {
    const leftRemain = twoCol ? bodyBottom - ty : 0;
    const rightRemain = bodyBottom - vy;
    const useLeft = twoCol && leftRemain > rightRemain;
    const h = useLeft ? leftRemain : rightRemain;
    if (h < CHART_MIN) return null;
    if (useLeft) {
      const slot = { x: MARGIN, y: ty, w: textW, h };
      ty = bodyBottom;
      return slot;
    }
    const slot = { x: visX, y: vy, w: visW, h };
    vy = bodyBottom;
    return slot;
  };

  for (const chart of s.charts ?? []) {
    const slot = chartSlot();
    if (!slot) break;
    addSimpleChart(pptx, slide, chart, slot.x, slot.y, slot.w, slot.h);
  }

  if (s.bandedCharts && s.bandedCharts.length > 0) {
    const slot = chartSlot();
    if (slot) {
      addBandedChart(pptx, slide, s.bandedCharts, slot.x, slot.y, slot.w, slot.h);
    }
  }

  if (valueFig) {
    addValueStrip(slide, valueFig, CONTENT_BOTTOM - STRIP_H, STRIP_H);
  }

  if (s.footnote) {
    slide.addText(s.footnote, {
      x: MARGIN,
      y: CONTENT_BOTTOM - FOOTNOTE_H + 0.06,
      w: CONTENT_W,
      h: FOOTNOTE_H - 0.06,
      fontSize: 8,
      italic: true,
      fontFace: SANS,
      color: SLATE2,
      valign: "top",
      wrap: true,
      fit: "shrink",
    });
  }

  const notes = [
    s.speakerNotes ?? "",
    s.assumptionsUsed?.length
      ? `\nAssumptions used: ${s.assumptionsUsed.join("; ")}`
      : "",
  ]
    .join("")
    .trim();
  if (notes) slide.addNotes(notes);
}

// ── Elements ────────────────────────────────────────────────────────────────

const NO_BORDER = { type: "none" as const };
const headerBorder = [
  NO_BORDER,
  NO_BORDER,
  { color: LINE2, pt: 1 },
  NO_BORDER,
] as PptxGenJS.TableCellProps["border"];
const rowBorder = [
  NO_BORDER,
  NO_BORDER,
  { color: LINE, pt: 0.5 },
  NO_BORDER,
] as PptxGenJS.TableCellProps["border"];

/** Template-style open table: uppercase letterspaced header, hairline row
 *  rules, no fills — the ivory canvas shows through. */
function addOpenTable(
  slide: PptxGenJS.Slide,
  table: TableData,
  x: number,
  y: number,
  w: number,
  pt: number = TABLE_PT,
): void {
  const rows: PptxGenJS.TableRow[] = [
    table.columns.map((c) => ({
      text: c.toUpperCase(),
      options: {
        fontSize: Math.min(7.5, pt * 0.75),
        color: SLATE2,
        fontFace: SANS,
        charSpacing: 1.5,
        border: headerBorder,
        valign: "bottom",
      },
    })),
    ...table.rows.map((r) =>
      r.map((cell, ci) => ({
        text: String(cell),
        options: {
          fontFace: SANS,
          fontSize: pt,
          color: ci === 0 ? INK : INK_SOFT,
          bold: ci === 0,
          border: rowBorder,
        },
      })),
    ),
  ];
  slide.addTable(rows, {
    x,
    y,
    w,
    colW: tableColWidths(table.columns.length, w),
    valign: "middle",
    margin: 0.06,
    autoPage: false,
  });
}

/** Conservative → base → upside strip (exec summary), per the template's
 *  value band: three serif figures over a three-segment cream→clay bar. */
function addValueStrip(
  slide: PptxGenJS.Slide,
  fig: Ranged,
  y: number,
  h: number,
): void {
  slide.addShape("roundRect", {
    x: MARGIN,
    y,
    w: CONTENT_W,
    h,
    rectRadius: 0.07,
    fill: { color: "FFFFFF" },
    line: { color: LINE, width: 0.75 },
  });

  const blockW = 2.45;
  slide.addText(
    [
      { text: fmtCurrency(fig.low), options: { fontSize: 22, fontFace: SERIF, color: SLATE, breakLine: true } },
      { text: "CONSERVATIVE", options: { fontSize: 7.5, fontFace: SANS, color: SLATE2, charSpacing: 2 } },
    ],
    { x: MARGIN + 0.3, y: y + 0.18, w: blockW, h: h - 0.36, valign: "middle", fit: "shrink" },
  );
  slide.addText(
    [
      { text: fmtCurrency(fig.high), options: { fontSize: 22, fontFace: SERIF, color: INK, breakLine: true, align: "right" } },
      { text: "UPSIDE", options: { fontSize: 7.5, fontFace: SANS, color: SLATE2, charSpacing: 2, align: "right" } },
    ],
    { x: PAGE_W - MARGIN - blockW - 0.3, y: y + 0.18, w: blockW, h: h - 0.36, valign: "middle", fit: "shrink", align: "right" },
  );

  const barX = MARGIN + blockW + 0.7;
  const barW = CONTENT_W - (blockW + 0.7) * 2;
  slide.addText(`${fmtCurrency(fig.base)}  ·  annual value, base case`, {
    x: barX,
    y: y + 0.16,
    w: barW,
    h: 0.36,
    fontSize: 15,
    fontFace: SERIF,
    color: CLAY_DEEP,
    align: "center",
    fit: "shrink",
  });
  const segW = barW / 3;
  (["EAE6DA", CLAY, CLAY_DEEP] as const).forEach((color, i) => {
    slide.addShape("rect", {
      x: barX + i * segW,
      y: y + 0.62,
      w: segW - (i < 2 ? 0.06 : 0),
      h: 0.1,
      fill: { color },
      line: { type: "none" },
    });
  });
}

/** Value-map exhibit, as a headered table — no bars: the strategy reads across
 *  (GOAL → USE CASES → VALUE DRIVER + the P&L line it impacts → ANNUAL VALUE)
 *  with the number big, bold and auburn, right-anchored, and a bold auburn total
 *  pinned beneath it. Mirrors app/_components/charts/ranked-value.tsx; geometry
 *  matches rankedValueH() so the estimate, the render and check-pptx agree. */
function addRankedValue(
  slide: PptxGenJS.Slide,
  rv: RankedValue,
  x: number,
  y: number,
  w: number,
  h: number,
  scale = 1,
): void {
  void h; // height is reserved by the caller via rankedValueH(); kept for parity
  const fmt = rv.format === "number" ? fmtNumber : fmtCurrency;

  const PAD = 0.12;
  const GOAL_W = w * 0.23;
  const USES_W = w * 0.34;
  const DRIVER_W = w * 0.25;
  const VAL_W = w - GOAL_W - USES_W - DRIVER_W;
  const goalX = x;
  const usesX = x + GOAL_W;
  const driverX = usesX + USES_W;
  const valX = x + w - VAL_W;

  // ── Header row + rule ──
  const headers: [string, number, number, "left" | "right"][] = [
    ["STRATEGIC GOAL", goalX, GOAL_W, "left"],
    ["USE CASES", usesX, USES_W, "left"],
    ["VALUE DRIVER", driverX, DRIVER_W, "left"],
    ["ANNUAL VALUE", valX, VAL_W, "right"],
  ];
  for (const [t, cx, cw, align] of headers) {
    slide.addText(t, {
      x: cx,
      y,
      w: cw - PAD,
      h: RANKED_HEADER_H - 0.1,
      fontSize: 7.5 * scale,
      bold: true,
      fontFace: SANS,
      color: SLATE2,
      charSpacing: 1.5,
      align,
      valign: "bottom",
      fit: "shrink",
    });
  }
  slide.addShape("rect", { x, y: y + RANKED_HEADER_H - 0.06, w, h: 0.009, fill: { color: LINE2 }, line: NO_BORDER });

  // ── Rows ──
  const rowsTop = y + RANKED_HEADER_H;
  rv.rows.forEach((row, i) => {
    const ry = rowsTop + i * (RANKED_ROW_H + RANKED_ROW_GAP);
    slide.addText(row.label, {
      x: goalX, y: ry, w: GOAL_W - PAD, h: RANKED_ROW_H,
      fontSize: 11 * scale, bold: true, fontFace: SANS, color: INK,
      valign: "middle", wrap: true, fit: "shrink",
    });
    slide.addText(row.chain?.[0] ?? "", {
      x: usesX, y: ry, w: USES_W - PAD, h: RANKED_ROW_H,
      fontSize: 9 * scale, fontFace: SANS, color: SLATE,
      valign: "middle", wrap: true, fit: "shrink",
    });
    const driverRuns: { text: string; options: Record<string, unknown> }[] = [
      { text: row.valueNote ?? "", options: { fontSize: 9.5 * scale, fontFace: SANS, color: INK_SOFT, bold: true } },
    ];
    if (row.impact) {
      driverRuns.push({ text: "\n" + row.impact, options: { fontSize: 8 * scale, fontFace: SANS, color: SLATE2 } });
    }
    slide.addText(driverRuns, {
      x: driverX, y: ry, w: DRIVER_W - PAD, h: RANKED_ROW_H,
      valign: "middle", wrap: true, fit: "shrink",
    });
    slide.addText(fmt(row.value), {
      x: valX, y: ry, w: VAL_W, h: RANKED_ROW_H,
      align: "right", valign: "middle", fontFace: SERIF, color: CLAY_DEEP,
      fontSize: 17 * scale, bold: true, fit: "shrink",
    });
    // hairline row divider, mid-gap so it never overlaps a cell
    slide.addShape("rect", {
      x, y: ry + RANKED_ROW_H + RANKED_ROW_GAP / 2, w, h: 0.006,
      fill: { color: LINE }, line: NO_BORDER,
    });
  });

  // ── Bold auburn total, aligned under the value column ──
  const totalY = rowsTop + rv.rows.length * (RANKED_ROW_H + RANKED_ROW_GAP);
  slide.addShape("rect", { x, y: totalY + 0.02, w, h: 0.012, fill: { color: LINE2 }, line: NO_BORDER });
  slide.addText(rv.total.label.toUpperCase(), {
    x, y: totalY + 0.08, w: valX - x - PAD, h: RANKED_TOTAL_H - 0.12,
    align: "right", valign: "middle", fontFace: SANS, color: SLATE,
    fontSize: 9 * scale, bold: true, charSpacing: 1, fit: "shrink",
  });
  slide.addText(fmt(rv.total.value), {
    x: valX, y: totalY + 0.06, w: VAL_W, h: RANKED_TOTAL_H - 0.08,
    align: "right", valign: "middle", fontFace: SERIF, color: CLAY_DEEP,
    fontSize: 21 * scale, bold: true, fit: "shrink",
  });
}

const AXIS_OPTS = {
  catAxisLabelFontSize: 8,
  catAxisLabelColor: SLATE,
  catAxisLabelFontFace: SANS,
  catAxisLineColor: LINE2,
  valAxisLabelFontSize: 8,
  valAxisLabelColor: SLATE,
  valAxisLabelFontFace: SANS,
  valAxisLineColor: LINE2,
  valGridLine: { color: LINE, style: "solid" as const, size: 0.5 },
};

function addSimpleChart(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  chart: ChartSeries,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const categorical = typeof chart.points[0]?.x === "string";
  slide.addChart(
    categorical ? pptx.ChartType.bar : pptx.ChartType.line,
    [
      {
        name: chart.name,
        labels: chart.points.map((p) => String(p.x)),
        values: chart.points.map((p) => p.y),
      },
    ],
    {
      x,
      y,
      w,
      h,
      barDir: categorical ? "bar" : undefined,
      chartColors: [SERIES_HUES[0].base],
      plotArea: { fill: { color: "FFFFFF" } },
      showTitle: true,
      title: chart.name,
      titleFontSize: 10,
      titleColor: SLATE,
      titleFontFace: SERIF,
      showLegend: false,
      valAxisLabelFormatCode: chart.format === "currency" ? "$#,##0,," : "#,##0",
      ...AXIS_OPTS,
    },
  );
}

/** Banded series render as three lines per band (base heavy in the hue,
 *  low/high in a lighter tint) — PptxGenJS can't shade ranges natively, and
 *  this stays fully editable in PowerPoint. */
function addBandedChart(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  series: BandedSeries[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const labels = series[0].points.map((p) => String(p.x));
  const data: { name: string; labels: string[]; values: number[] }[] = [];
  const colors: string[] = [];

  series.forEach((s, si) => {
    const hue = SERIES_HUES[si % SERIES_HUES.length];
    data.push({ name: `${s.name} — high`, labels, values: s.points.map((p) => p.high) });
    colors.push(hue.edge);
    data.push({ name: `${s.name} — base`, labels, values: s.points.map((p) => p.base) });
    colors.push(hue.base);
    data.push({ name: `${s.name} — low`, labels, values: s.points.map((p) => p.low) });
    colors.push(hue.edge);
  });

  slide.addChart(pptx.ChartType.line, data, {
    x,
    y,
    w,
    h,
    chartColors: colors,
    plotArea: { fill: { color: "FFFFFF" } },
    lineSize: 1.5,
    lineSmooth: false,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 4,
    showTitle: true,
    title: series.map((s) => s.name).join(" vs. "),
    titleFontSize: 10,
    titleColor: SLATE,
    titleFontFace: SERIF,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 8,
    legendColor: SLATE,
    legendFontFace: SANS,
    valAxisLabelFormatCode: series[0].format === "currency" ? "$#,##0,," : "#,##0",
    ...AXIS_OPTS,
  });
}

// ── Cover ───────────────────────────────────────────────────────────────────
export function addTitleSlide(
  pptx: PptxGenJS,
  companyName: string,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });

  slide.addText("EXECUTIVE OVERVIEW", {
    x: PAGE_W - MARGIN - 3.4,
    y: 0.62,
    w: 3.4,
    h: 0.28,
    fontSize: 9.5,
    fontFace: SANS,
    color: SLATE2,
    align: "right",
    charSpacing: 2.5,
  });

  slide.addShape("rect", {
    x: MARGIN,
    y: 2.36,
    w: 0.3,
    h: 0.024,
    fill: { color: CLAY },
    line: { type: "none" },
  });
  slide.addText("ENTERPRISE AI · BUSINESS VALUE PROPOSAL", {
    x: MARGIN + 0.42,
    y: 2.25,
    w: CONTENT_W - 0.42,
    h: 0.28,
    fontSize: 10.5,
    bold: true,
    fontFace: SANS,
    color: CLAY_DEEP,
    charSpacing: 3,
  });

  slide.addText("Making AI the way\nwork gets done.", {
    x: MARGIN,
    y: 2.7,
    w: CONTENT_W,
    h: 1.7,
    fontSize: 47,
    bold: false,
    fontFace: SERIF,
    color: INK,
    fit: "shrink",
    valign: "top",
  });
  slide.addText(companyName, {
    x: MARGIN,
    y: 4.5,
    w: CONTENT_W,
    h: 0.5,
    fontSize: 21,
    italic: true,
    fontFace: SERIF,
    color: CLAY_DEEP,
    fit: "shrink",
  });

  const meta: [string, string][] = [
    ["Prepared for", companyName],
    ["Engagement", "Enterprise AI business case"],
  ];
  meta.forEach(([label, value], i) => {
    slide.addText(
      [
        {
          text: label.toUpperCase(),
          options: { fontSize: 8, bold: true, fontFace: SANS, color: CLAY_DEEP, charSpacing: 2, breakLine: true },
        },
        { text: value, options: { fontSize: 12, fontFace: SANS, color: INK_SOFT } },
      ],
      { x: MARGIN + i * 4.0, y: 5.45, w: 3.7, h: 0.75, valign: "top", fit: "shrink" },
    );
  });
}

// ── Appendix divider (dark) ─────────────────────────────────────────────────
export function addAppendixDivider(
  pptx: PptxGenJS,
  appendixTitles: string[],
  presentationMode: "draft" | "client" = "draft",
): void {
  const slide = pptx.addSlide();
  slide.background = { color: INK };

  slide.addShape("rect", {
    x: MARGIN,
    y: 0.66,
    w: 0.3,
    h: 0.024,
    fill: { color: CLAY },
    line: { type: "none" },
  });
  slide.addText("APPENDIX", {
    x: MARGIN + 0.42,
    y: 0.55,
    w: 6,
    h: 0.28,
    fontSize: 10.5,
    bold: true,
    fontFace: SANS,
    color: CLAY,
    charSpacing: 3,
  });
  slide.addText("SUPPORTING DETAIL", {
    x: PAGE_W - MARGIN - 3.4,
    y: 0.55,
    w: 3.4,
    h: 0.28,
    fontSize: 9.5,
    fontFace: SANS,
    color: SLATE2,
    align: "right",
    charSpacing: 2.5,
  });

  slide.addText("The numbers behind the case.", {
    x: MARGIN,
    y: 3.4,
    w: CONTENT_W,
    h: 1.0,
    fontSize: 44,
    bold: false,
    fontFace: SERIF,
    color: CREAM,
    fit: "shrink",
  });
  slide.addText(
    "Scenario modeling, assumptions, and the consumption economics — for the teams who want to pressure-test the plan.",
    {
      x: MARGIN,
      y: 4.45,
      w: CONTENT_W - 2,
      h: 0.6,
      fontSize: 14,
      fontFace: SANS,
      color: "CFC9BB",
      fit: "shrink",
      valign: "top",
    },
  );

  // Lay the appendix index out in a bounded grid (≤ 3 per row, wrapping to a
  // second row) so titles NEVER run off the right edge regardless of count.
  const COLS = Math.min(3, Math.max(1, appendixTitles.length));
  const gridGap = 0.3;
  const cellW = (CONTENT_W - gridGap * (COLS - 1)) / COLS;
  const rowH = 0.46;
  const gridTop = 5.15;
  // 3 rows × 3 cols = 9 titles before an overflow label, so the typical appendix
  // (forecast, cost, value-calc, coding, IT-takeout, financial-rollup, persona,
  // + scenario slides) is listed out rather than hidden behind "+N more".
  const maxRows = 3;
  const shown = appendixTitles.slice(0, COLS * maxRows);
  shown.forEach((title, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const isOverflowLabel =
      i === shown.length - 1 && appendixTitles.length > shown.length;
    const label = isOverflowLabel
      ? `+ ${appendixTitles.length - shown.length + 1} more`
      : title;
    slide.addText(
      [
        { text: `A${i + 1}  `, options: { fontSize: 15, fontFace: SERIF, color: CLAY } },
        { text: label, options: { fontSize: 12, fontFace: SANS, color: "CFC9BB" } },
      ],
      {
        x: MARGIN + col * (cellW + gridGap),
        y: gridTop + row * rowH,
        w: cellW,
        h: rowH,
        valign: "middle",
        wrap: true,
        fit: "shrink",
      },
    );
  });

  // Dark variant of the brand footer (the ivory master doesn't apply here)
  const footY = PAGE_H - 0.46;
  slide.addShape("rect", {
    x: MARGIN,
    y: footY - 0.1,
    w: CONTENT_W,
    h: 0.009,
    fill: { color: DARK_FOOT_LINE },
    line: { type: "none" },
  });
  slide.addText("Business Value Services", {
    x: MARGIN,
    y: footY,
    w: 4,
    h: 0.26,
    fontSize: 8.5,
    bold: true,
    fontFace: SANS,
    color: "A9A496",
  });
  slide.addText(
    presentationMode === "client" ? "CONFIDENTIAL" : "CONFIDENTIAL — DRAFT FOR DISCUSSION",
    {
      x: PAGE_W - MARGIN - 4,
      y: footY,
      w: 4,
      h: 0.26,
      fontSize: 7.5,
      fontFace: SANS,
      color: "7C786D",
      align: "right",
      charSpacing: 2,
    },
  );
}
