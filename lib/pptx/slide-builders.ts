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
  SectionOutput,
  TableData,
} from "@/lib/types";
import { fmtCurrency } from "@/lib/format";

// ── Geometry ────────────────────────────────────────────────────────────────
const PAGE_W = 13.33;
const PAGE_H = 7.5;
const MARGIN = 0.72;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_H - 0.62; // clear of the master footer rule
const COL_GAP = 0.4;
const LEFT_COL_W = 5.2;

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

// ── Text metrics (conservative estimates; pt → inches at 72pt/in) ──────────
const lineH = (pt: number) => (1.42 * pt) / 72;
const charsPerLine = (widthIn: number, pt: number) =>
  Math.max(8, Math.floor(widthIn / (0.0074 * pt)));

function textLines(text: string, widthIn: number, pt: number): number {
  const cpl = charsPerLine(widthIn, pt);
  return text
    .split("\n")
    .reduce((acc, ln) => acc + Math.max(1, Math.ceil(ln.length / cpl)), 0);
}

function textBlockH(text: string, widthIn: number, pt: number): number {
  return textLines(text, widthIn, pt) * lineH(pt) + 0.08;
}

function bulletsH(bullets: string[], widthIn: number, pt: number): number {
  const para = 0.11;
  const usable = widthIn - 0.25;
  return (
    bullets.reduce((acc, b) => acc + textLines(b, usable, pt) * lineH(pt) + para, 0) +
    0.12
  );
}

function tableColWidths(cols: number, totalW: number): number[] {
  const weights =
    cols === 2 ? [0.45, 0.55]
    : cols === 3 ? [0.4, 0.3, 0.3]
    : cols === 4 ? [0.34, 0.22, 0.22, 0.22]
    : Array.from({ length: cols }, () => 1 / cols);
  return weights.map((w) => w * totalW);
}

const TABLE_FONT = 10;
const CELL_PAD_H = 0.14;

function tableH(table: TableData, totalW: number): number {
  const colW = tableColWidths(table.columns.length, totalW);
  const rowH = (cells: (string | number)[]) =>
    Math.max(
      ...cells.map((c, i) =>
        textLines(String(c), Math.max(colW[i] - 0.15, 0.3), TABLE_FONT),
      ),
    ) *
      lineH(TABLE_FONT) +
    CELL_PAD_H;
  return rowH(table.columns) + table.rows.reduce((acc, r) => acc + rowH(r), 0) + 0.1;
}

// ── Master slide (footer brand) ─────────────────────────────────────────────
export const MASTER = "BVC";

export function defineBrandMaster(pptx: PptxGenJS): void {
  const footY = PAGE_H - 0.46;
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
          text: "CONFIDENTIAL — DRAFT FOR DISCUSSION",
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
  slide.addText(kicker.toUpperCase(), {
    x: MARGIN + 0.42,
    y,
    w: CONTENT_W - 1.5,
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
}

export function addSectionSlide(
  pptx: PptxGenJS,
  s: SectionOutput,
  opts: SectionSlideOpts,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });

  const kicker = opts.appendixIndex
    ? `Appendix A${opts.appendixIndex} · ${s.title}`
    : s.title;
  let y = addHeader(slide, kicker, opts.pageNo, s.subtitle ?? s.title, s.narrative);

  // Exec-summary value strip is reserved at the bottom before laying out the
  // body, so the budget math keeps everything collision-free.
  const valueFig =
    s.kind === "executive_summary" ? s.rangedFigures?.annualValueFinalYear : undefined;
  const STRIP_H = 1.12;
  const bodyBottom = valueFig ? CONTENT_BOTTOM - STRIP_H - 0.18 : CONTENT_BOTTOM;

  // Stats row — cream cards, big-ish serif clay-deep value, label beneath
  if (s.stats && s.stats.length > 0) {
    const gap = 0.18;
    const cardH = 0.98;
    const w = (CONTENT_W - gap * (s.stats.length - 1)) / s.stats.length;
    s.stats.forEach((stat, i) => {
      const x = MARGIN + i * (w + gap);
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h: cardH,
        rectRadius: 0.07,
        fill: { color: CREAM },
        line: { color: LINE, width: 0.75 },
      });
      slide.addText(
        [
          {
            text: stat.value,
            options: {
              fontSize: 12.5,
              fontFace: SERIF,
              color: CLAY_DEEP,
              breakLine: true,
            },
          },
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
          h: cardH - 0.2,
          valign: "top",
          fit: "shrink",
        },
      );
    });
    y += cardH + 0.22;
  }

  const hasVisual =
    Boolean(s.table) || (s.charts?.length ?? 0) > 0 || (s.bandedCharts?.length ?? 0) > 0;
  const twoCol = Boolean(s.bullets?.length) && hasVisual;
  const bodyTop = y;

  const textW = twoCol ? LEFT_COL_W : CONTENT_W;
  const visX = twoCol ? MARGIN + LEFT_COL_W + COL_GAP : MARGIN;
  const visW = twoCol ? CONTENT_W - LEFT_COL_W - COL_GAP : CONTENT_W;

  let ty = bodyTop;
  if (s.bullets && s.bullets.length > 0) {
    const h = Math.min(bulletsH(s.bullets, textW, 11.5), bodyBottom - ty);
    slide.addText(
      s.bullets.map((b) => ({
        text: b,
        options: {
          bullet: { code: "2022", indent: 10, color: CLAY },
          breakLine: true,
          paraSpaceAfter: 9,
        },
      })),
      {
        x: MARGIN,
        y: ty,
        w: textW,
        h,
        fontSize: 11.5,
        fontFace: SANS,
        color: INK_SOFT,
        valign: "top",
        fit: "shrink",
        lineSpacingMultiple: 1.14,
      },
    );
    ty += h + 0.12;
  }

  let vy = twoCol ? bodyTop : ty;

  if (s.table) {
    const th = Math.min(tableH(s.table, visW), bodyBottom - vy);
    addOpenTable(slide, s.table, visX, vy, visW);
    vy += th + 0.2;
  }

  // Charts take the REMAINDER of whichever column has the most room.
  const chartSlot = (): { x: number; y: number; w: number; h: number } | null => {
    const leftRemain = twoCol ? bodyBottom - ty : 0;
    const rightRemain = bodyBottom - vy;
    const useLeft = twoCol && leftRemain > rightRemain;
    const h = useLeft ? leftRemain : rightRemain;
    if (h < 1.4) return null;
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
): void {
  const rows: PptxGenJS.TableRow[] = [
    table.columns.map((c) => ({
      text: c.toUpperCase(),
      options: {
        fontSize: 7.5,
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
          fontSize: TABLE_FONT,
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

  const blockW = 2.35;
  slide.addText(
    [
      { text: fmtCurrency(fig.low), options: { fontSize: 19, fontFace: SERIF, color: SLATE, breakLine: true } },
      { text: "CONSERVATIVE", options: { fontSize: 7.5, fontFace: SANS, color: SLATE2, charSpacing: 2 } },
    ],
    { x: MARGIN + 0.3, y: y + 0.18, w: blockW, h: h - 0.36, valign: "middle", fit: "shrink" },
  );
  slide.addText(
    [
      { text: fmtCurrency(fig.high), options: { fontSize: 19, fontFace: SERIF, color: INK, breakLine: true, align: "right" } },
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
    h: 0.34,
    fontSize: 13,
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
  sectionCount: number,
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
    ["Scope", `${sectionCount} sections · ranged economics`],
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

  appendixTitles.forEach((title, i) => {
    slide.addText(
      [
        { text: `A${i + 1}  `, options: { fontSize: 16, fontFace: SERIF, color: CLAY } },
        { text: title, options: { fontSize: 12.5, fontFace: SANS, color: "CFC9BB" } },
      ],
      { x: MARGIN + i * 4.2, y: 5.35, w: 4.0, h: 0.4, valign: "middle", fit: "shrink" },
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
  slide.addText("CONFIDENTIAL — DRAFT FOR DISCUSSION", {
    x: PAGE_W - MARGIN - 4,
    y: footY,
    w: 4,
    h: 0.26,
    fontSize: 7.5,
    fontFace: SANS,
    color: "7C786D",
    align: "right",
    charSpacing: 2,
  });
}
