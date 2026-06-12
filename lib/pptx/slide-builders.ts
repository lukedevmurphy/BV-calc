// Server-only: SectionOutput → PptxGenJS slides. Imported exclusively by
// app/api/pptx/route.ts so PptxGenJS never enters the client bundle.
//
// Design system mirrors the web theme (app/globals.css — keep hex values in
// sync): cream canvas, paper surfaces, warm ink, terracotta accent, serif
// display type (Georgia as the PowerPoint-safe Tiempos stand-in, Calibri body).
//
// LAYOUT INVARIANT: no two shapes on a slide may overlap. Text and table
// heights are estimated conservatively before placement, charts receive the
// REMAINING space (never a fixed size), and every text box carries
// fit:"shrink" so content can never escape its box. scripts/check-pptx.ts
// parses the slide XML and asserts pairwise non-overlap of all shapes.

import type PptxGenJS from "pptxgenjs";
import type { BandedSeries, ChartSeries, SectionOutput, TableData } from "@/lib/types";

// ── Geometry ────────────────────────────────────────────────────────────────
const PAGE_W = 13.33;
const PAGE_H = 7.5;
const MARGIN = 0.6;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_H - 0.45; // keep clear of the master footer
const COL_GAP = 0.4;
const LEFT_COL_W = 5.3; // bullets/narrative column when a visual shares the slide

// ── Palette (mirrors app/globals.css) ───────────────────────────────────────
const BG_CANVAS = "F0EEE6";
const SURFACE = "FAF9F5";
const INK = "1F1E1D";
const INK_SECONDARY = "5E5A52";
const INK_TERTIARY = "8A857B";
const LINE = "DCD5C8";
const ACCENT = "C15F3C"; // terracotta — emphasis text
const ACCENT_BRIGHT = "D97757"; // Claude coral — hairlines, fills

const SERIF = "Georgia";
const SANS = "Calibri";

// value = sage, cost = terracotta, net = umber (same semantics as the web)
const SERIES_HUES = [
  { base: "4A7862", edge: "A9C8B6" },
  { base: "C15F3C", edge: "EBC0AC" },
  { base: "9C7C4D", edge: "D9C7A8" },
];

// ── Text metrics (conservative estimates; pt → inches at 72pt/in) ──────────
const lineH = (pt: number) => (1.42 * pt) / 72;
const charsPerLine = (widthIn: number, pt: number) =>
  Math.max(8, Math.floor(widthIn / (0.0074 * pt)));

function textLines(text: string, widthIn: number, pt: number): number {
  const cpl = charsPerLine(widthIn, pt);
  // Estimate word wrap per explicit line
  return text
    .split("\n")
    .reduce((acc, ln) => acc + Math.max(1, Math.ceil(ln.length / cpl)), 0);
}

function textBlockH(text: string, widthIn: number, pt: number): number {
  return textLines(text, widthIn, pt) * lineH(pt) + 0.08;
}

function bulletsH(bullets: string[], widthIn: number, pt: number): number {
  const para = 0.11; // paraSpaceAfter 8pt
  const usable = widthIn - 0.25; // bullet indent
  return (
    bullets.reduce((acc, b) => acc + textLines(b, usable, pt) * lineH(pt) + para, 0) +
    0.12
  );
}

/** Column width weights per column count — first column is the label column. */
function tableColWidths(cols: number, totalW: number): number[] {
  const weights =
    cols === 2 ? [0.45, 0.55]
    : cols === 3 ? [0.4, 0.3, 0.3]
    : cols === 4 ? [0.34, 0.22, 0.22, 0.22]
    : Array.from({ length: cols }, () => 1 / cols);
  return weights.map((w) => w * totalW);
}

const TABLE_FONT = 9.5;
const CELL_PAD_H = 0.13;

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
  return (
    rowH(table.columns) +
    table.rows.reduce((acc, r) => acc + rowH(r), 0) +
    0.1
  );
}

// ── Master slides ───────────────────────────────────────────────────────────
export const MASTER = "BRAND";

export function defineBrandMaster(pptx: PptxGenJS, companyName: string): void {
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: BG_CANVAS },
    objects: [
      {
        text: {
          text: `Business Value Proposal · ${companyName}`,
          options: {
            x: MARGIN,
            y: PAGE_H - 0.34,
            w: 8,
            h: 0.25,
            fontSize: 8,
            fontFace: SANS,
            color: INK_TERTIARY,
          },
        },
      },
    ],
    slideNumber: {
      x: PAGE_W - 0.85,
      y: PAGE_H - 0.34,
      w: 0.5,
      h: 0.25,
      fontSize: 8,
      fontFace: SANS,
      color: INK_TERTIARY,
    },
  });
}

// ── Section slide ───────────────────────────────────────────────────────────
export function addSectionSlide(pptx: PptxGenJS, s: SectionOutput): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  let y = 0.5;

  // Header: serif title, optional subtitle, coral hairline
  slide.addText(s.title, {
    x: MARGIN,
    y,
    w: CONTENT_W,
    h: 0.52,
    fontSize: 27,
    bold: true,
    fontFace: SERIF,
    color: INK,
    fit: "shrink",
  });
  y += 0.58;

  if (s.subtitle) {
    const h = Math.min(textBlockH(s.subtitle, CONTENT_W, 12.5), 0.62);
    slide.addText(s.subtitle, {
      x: MARGIN,
      y,
      w: CONTENT_W,
      h,
      fontSize: 12.5,
      fontFace: SANS,
      color: INK_SECONDARY,
      fit: "shrink",
      valign: "top",
    });
    y += h + 0.06;
  }

  slide.addShape("rect", {
    x: MARGIN,
    y,
    w: 1.2,
    h: 0.035,
    fill: { color: ACCENT_BRIGHT },
    line: { type: "none" },
  });
  y += 0.18;

  // Stats row — paper cards on the cream canvas
  if (s.stats && s.stats.length > 0) {
    const gap = 0.18;
    const cardH = 0.92;
    const w = (CONTENT_W - gap * (s.stats.length - 1)) / s.stats.length;
    s.stats.forEach((stat, i) => {
      const x = MARGIN + i * (w + gap);
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h: cardH,
        rectRadius: 0.05,
        fill: { color: SURFACE },
        line: { color: LINE, width: 0.75 },
      });
      slide.addText(
        [
          {
            text: stat.label.toUpperCase(),
            options: {
              fontSize: 7.5,
              fontFace: SANS,
              color: INK_TERTIARY,
              breakLine: true,
              charSpacing: 1,
            },
          },
          {
            text: stat.value,
            options: { fontSize: 11.5, bold: true, fontFace: SERIF, color: INK },
          },
        ],
        {
          x: x + 0.12,
          y: y + 0.07,
          w: w - 0.24,
          h: cardH - 0.14,
          valign: "top",
          fit: "shrink",
        },
      );
    });
    y += cardH + 0.22;
  }

  // Body: two columns when bullets share the slide with a table/chart,
  // otherwise full width. Heights are estimated up front; charts take the
  // remainder so nothing can collide.
  const hasVisual = Boolean(s.table) || (s.charts?.length ?? 0) > 0 || (s.bandedCharts?.length ?? 0) > 0;
  const twoCol = Boolean(s.bullets?.length) && hasVisual;
  const bodyTop = y;
  const bodyBudget = CONTENT_BOTTOM - bodyTop;

  const textW = twoCol ? LEFT_COL_W : CONTENT_W;
  const visX = twoCol ? MARGIN + LEFT_COL_W + COL_GAP : MARGIN;
  const visW = twoCol ? CONTENT_W - LEFT_COL_W - COL_GAP : CONTENT_W;

  // Left (or full-width) text column
  let ty = bodyTop;
  if (s.bullets && s.bullets.length > 0) {
    const h = Math.min(bulletsH(s.bullets, textW, 11.5), bodyBudget);
    slide.addText(
      s.bullets.map((b) => ({
        text: b,
        options: {
          bullet: { code: "2022", indent: 10, color: ACCENT },
          breakLine: true,
          paraSpaceAfter: 8,
        },
      })),
      {
        x: MARGIN,
        y: ty,
        w: textW,
        h,
        fontSize: 11.5,
        fontFace: SANS,
        color: INK,
        valign: "top",
        fit: "shrink",
        lineSpacingMultiple: 1.12,
      },
    );
    ty += h + 0.12;
  }

  if (s.narrative) {
    const h = Math.min(textBlockH(s.narrative, textW, 11), CONTENT_BOTTOM - ty);
    if (h > 0.2) {
      slide.addText(s.narrative, {
        x: MARGIN,
        y: ty,
        w: textW,
        h,
        fontSize: 11,
        italic: true,
        fontFace: SERIF,
        color: INK_SECONDARY,
        valign: "top",
        fit: "shrink",
      });
      ty += h + 0.1;
    }
  }

  // Visual column (right when twoCol, else continues below the text)
  let vy = twoCol ? bodyTop : ty;

  if (s.table) {
    const th = Math.min(tableH(s.table, visW), CONTENT_BOTTOM - vy);
    addBrandTable(slide, s.table, visX, vy, visW);
    vy += th + 0.2;
  }

  // Charts go to whichever column has the most remaining room (in two-column
  // layouts the text column often ends higher than a table does), and always
  // receive the REMAINDER of that column — never a fixed size — so they can't
  // collide with anything above them.
  const chartSlot = (): { x: number; y: number; w: number; h: number } | null => {
    const leftRemain = twoCol ? CONTENT_BOTTOM - ty : 0;
    const rightRemain = CONTENT_BOTTOM - vy;
    const useLeft = twoCol && leftRemain > rightRemain;
    const h = useLeft ? leftRemain : rightRemain;
    if (h < 1.4) return null; // never squeeze a chart into an unreadable sliver
    if (useLeft) {
      const slot = { x: MARGIN, y: ty, w: textW, h };
      ty = CONTENT_BOTTOM;
      return slot;
    }
    const slot = { x: visX, y: vy, w: visW, h };
    vy = CONTENT_BOTTOM;
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

function addBrandTable(
  slide: PptxGenJS.Slide,
  table: TableData,
  x: number,
  y: number,
  w: number,
): void {
  const colW = tableColWidths(table.columns.length, w);
  const rows: PptxGenJS.TableRow[] = [
    table.columns.map((c) => ({
      text: c,
      options: {
        bold: true,
        fill: { color: "E8E2D3" },
        color: INK_SECONDARY,
        fontFace: SANS,
      },
    })),
    ...table.rows.map((r, ri) =>
      r.map((cell) => ({
        text: String(cell),
        options: {
          fontFace: SANS,
          fill: { color: ri % 2 === 0 ? SURFACE : "F3F0E8" },
        },
      })),
    ),
  ];
  slide.addTable(rows, {
    x,
    y,
    w,
    colW,
    fontSize: TABLE_FONT,
    color: INK,
    border: { type: "solid", color: LINE, pt: 0.5 },
    valign: "middle",
    margin: 0.05,
    autoPage: false,
  });
}

const AXIS_OPTS = {
  catAxisLabelFontSize: 8,
  catAxisLabelColor: INK_SECONDARY,
  catAxisLabelFontFace: SANS,
  catAxisLineColor: LINE,
  valAxisLabelFontSize: 8,
  valAxisLabelColor: INK_SECONDARY,
  valAxisLabelFontFace: SANS,
  valAxisLineColor: LINE,
  valGridLine: { color: LINE, style: "solid" as const, size: 0.5 },
  chartColorsOpacity: 100,
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
      plotArea: { fill: { color: SURFACE } },
      showTitle: true,
      title: chart.name,
      titleFontSize: 10,
      titleColor: INK_SECONDARY,
      titleFontFace: SERIF,
      showLegend: false,
      valAxisLabelFormatCode: chart.format === "currency" ? "$#,##0,," : "#,##0",
      ...AXIS_OPTS,
    },
  );
}

/**
 * PptxGenJS has no shaded-band chart, so each BandedSeries renders as three
 * line series: base solid/heavy in the series hue, low/high thin in a lighter
 * tint of the same hue. Honest, legible, and fully editable in PowerPoint.
 */
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
    plotArea: { fill: { color: SURFACE } },
    lineSize: 1.5,
    lineSmooth: false,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 4,
    showTitle: true,
    title: series.map((s) => s.name).join(" vs. "),
    titleFontSize: 10,
    titleColor: INK_SECONDARY,
    titleFontFace: SERIF,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 8,
    legendColor: INK_SECONDARY,
    legendFontFace: SANS,
    valAxisLabelFormatCode: series[0].format === "currency" ? "$#,##0,," : "#,##0",
    ...AXIS_OPTS,
  });
}

// ── Title slide ─────────────────────────────────────────────────────────────
export function addTitleSlide(
  pptx: PptxGenJS,
  companyName: string,
  sectionCount: number,
): void {
  const slide = pptx.addSlide({ masterName: MASTER });

  slide.addShape("rect", {
    x: MARGIN,
    y: 2.35,
    w: 1.2,
    h: 0.045,
    fill: { color: ACCENT_BRIGHT },
    line: { type: "none" },
  });
  slide.addText("Business Value Proposal", {
    x: MARGIN,
    y: 2.55,
    w: CONTENT_W,
    h: 1.0,
    fontSize: 40,
    bold: true,
    fontFace: SERIF,
    color: INK,
    fit: "shrink",
  });
  slide.addText(companyName, {
    x: MARGIN,
    y: 3.6,
    w: CONTENT_W,
    h: 0.6,
    fontSize: 22,
    fontFace: SERIF,
    italic: true,
    color: ACCENT,
    fit: "shrink",
  });
  slide.addText(
    `${sectionCount} sections · every economic figure shown as a conservative / base / optimistic range`,
    {
      x: MARGIN,
      y: 4.35,
      w: CONTENT_W,
      h: 0.35,
      fontSize: 12,
      fontFace: SANS,
      color: INK_SECONDARY,
      fit: "shrink",
    },
  );
}
