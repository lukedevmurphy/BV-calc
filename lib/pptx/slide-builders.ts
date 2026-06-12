// Server-only: SectionOutput → PptxGenJS slides. Imported exclusively by
// app/api/pptx/route.ts so PptxGenJS never enters the client bundle.
//
// This is the second consumer of SectionOutput (the web renderer is the
// first). It maps the SAME structured fields — anything not representable
// here should not exist as a field.

import type PptxGenJS from "pptxgenjs";
import type { BandedSeries, ChartSeries, SectionOutput } from "@/lib/types";

const PAGE_W = 13.33;
const PAGE_H = 7.5;
const MARGIN = 0.55;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = "16202E";
const INK_SECONDARY = "4B5565";
const LINE = "CDD2DA";
const MUTED_BG = "F1F3F5";
const ACCENT = "B45309";

// Mirror the web palette (chart-utils.ts): value green, cost blue, net amber.
const SERIES_HUES = [
  { base: "15803D", edge: "86EFAC" },
  { base: "1D4ED8", edge: "93C5FD" },
  { base: "B45309", edge: "FCD34D" },
];

export function addSectionSlide(pptx: PptxGenJS, s: SectionOutput): void {
  const slide = pptx.addSlide();
  let y = 0.45;

  slide.addText(s.title, {
    x: MARGIN,
    y,
    w: CONTENT_W,
    h: 0.55,
    fontSize: 26,
    bold: true,
    color: INK,
  });
  y += 0.6;

  if (s.subtitle) {
    slide.addText(s.subtitle, {
      x: MARGIN,
      y,
      w: CONTENT_W,
      h: 0.4,
      fontSize: 13,
      color: INK_SECONDARY,
    });
    y += 0.5;
  }

  if (s.stats && s.stats.length > 0) {
    const gap = 0.2;
    const w = (CONTENT_W - gap * (s.stats.length - 1)) / s.stats.length;
    s.stats.forEach((stat, i) => {
      const x = MARGIN + i * (w + gap);
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h: 0.95,
        rectRadius: 0.06,
        fill: { color: MUTED_BG },
        line: { color: LINE, width: 0.75 },
      });
      slide.addText(
        [
          {
            text: stat.label.toUpperCase(),
            options: { fontSize: 8, color: INK_SECONDARY, breakLine: true },
          },
          { text: stat.value, options: { fontSize: 12, bold: true, color: INK } },
        ],
        { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.8, valign: "top" },
      );
    });
    y += 1.15;
  }

  // Split layout when bullets share the slide with a table or chart.
  const hasRightColumn = Boolean(s.bullets?.length) && Boolean(s.table || chartCount(s) > 0);
  const leftW = hasRightColumn ? CONTENT_W * 0.46 : CONTENT_W;
  const rightX = MARGIN + leftW + 0.35;
  const rightW = CONTENT_W - leftW - 0.35;
  const bodyTop = y;

  if (s.bullets && s.bullets.length > 0) {
    slide.addText(
      s.bullets.map((b) => ({
        text: b,
        options: { bullet: { code: "2022", indent: 12 }, breakLine: true, paraSpaceAfter: 8 },
      })),
      {
        x: MARGIN,
        y,
        w: leftW,
        h: Math.min(3.4, 0.5 * s.bullets.length + 0.4),
        fontSize: 12,
        color: INK,
        valign: "top",
      },
    );
    y += Math.min(3.4, 0.5 * s.bullets.length + 0.4) + 0.1;
  }

  if (s.narrative) {
    slide.addText(s.narrative, {
      x: MARGIN,
      y,
      w: leftW,
      h: 0.6,
      fontSize: 11,
      italic: true,
      color: INK_SECONDARY,
      valign: "top",
    });
    y += 0.7;
  }

  // Right column (or full width below bullets when no split)
  let ry = hasRightColumn ? bodyTop : y;
  const rx = hasRightColumn ? rightX : MARGIN;
  const rw = hasRightColumn ? rightW : CONTENT_W;

  if (s.table) {
    const rows: PptxGenJS.TableRow[] = [
      s.table.columns.map((c) => ({
        text: c,
        options: { bold: true, fill: { color: MUTED_BG }, color: INK_SECONDARY },
      })),
      ...s.table.rows.map((r) =>
        r.map((cell) => ({ text: String(cell), options: {} })),
      ),
    ];
    const tableH = 0.32 * (s.table.rows.length + 1);
    slide.addTable(rows, {
      x: rx,
      y: ry,
      w: rw,
      fontSize: 9.5,
      color: INK,
      border: { type: "solid", color: LINE, pt: 0.5 },
      valign: "middle",
      autoPage: false,
    });
    ry += tableH + 0.25;
  }

  for (const chart of s.charts ?? []) {
    const h = Math.min(3.1, PAGE_H - 0.4 - ry);
    if (h < 1.4) break;
    addSimpleChart(pptx, slide, chart, rx, ry, rw, h);
    ry += h + 0.15;
  }

  if (s.bandedCharts && s.bandedCharts.length > 0) {
    const h = Math.min(3.2, PAGE_H - 0.4 - ry);
    if (h >= 1.4) {
      addBandedChart(pptx, slide, s.bandedCharts, rx, ry, rw, h);
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

function chartCount(s: SectionOutput): number {
  return (s.charts?.length ?? 0) + (s.bandedCharts?.length ?? 0);
}

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
      showTitle: true,
      title: chart.name,
      titleFontSize: 10,
      titleColor: INK_SECONDARY,
      catAxisLabelFontSize: 8,
      valAxisLabelFontSize: 8,
      valAxisLabelFormatCode: chart.format === "currency" ? "$#,##0,," : "#,##0",
      showLegend: false,
      dataLabelFontSize: 8,
    },
  );
}

/**
 * PptxGenJS has no shaded-band chart, so each BandedSeries renders as three
 * line series: base solid/heavy in the series hue, low/high thin in a lighter
 * tint of the same hue. Honest, legible, and editable in PowerPoint.
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
    lineSize: 1.5,
    lineSmooth: false,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 4,
    showTitle: true,
    title: series.map((s) => s.name).join(" vs. "),
    titleFontSize: 10,
    titleColor: INK_SECONDARY,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 8,
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 8,
    valAxisLabelFormatCode: series[0].format === "currency" ? "$#,##0,," : "#,##0",
  });
}

/** Title slide for the deck. */
export function addTitleSlide(
  pptx: PptxGenJS,
  companyName: string,
  sectionCount: number,
): void {
  const slide = pptx.addSlide();
  slide.addText("Business Value Proposal", {
    x: MARGIN,
    y: 2.6,
    w: CONTENT_W,
    h: 0.9,
    fontSize: 36,
    bold: true,
    color: INK,
  });
  slide.addText(companyName, {
    x: MARGIN,
    y: 3.5,
    w: CONTENT_W,
    h: 0.6,
    fontSize: 20,
    color: ACCENT,
  });
  slide.addText(
    `${sectionCount} sections · all economics shown as conservative / base / optimistic ranges`,
    { x: MARGIN, y: 4.2, w: CONTENT_W, h: 0.4, fontSize: 12, color: INK_SECONDARY },
  );
}
