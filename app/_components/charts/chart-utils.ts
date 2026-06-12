import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/format";

export type ChartFormat = "currency" | "number" | "percent" | undefined;

export function tickFormatter(format: ChartFormat): (n: number) => string {
  if (format === "currency") return fmtCurrency;
  if (format === "percent") return fmtPercent;
  return fmtNumber;
}

/** Per-series hues, read from the @theme tokens in globals.css. Order matters:
 *  value (green) before cost (blue) matches how the forecast passes series. */
export const SERIES_COLORS = [
  { line: "var(--chart-value)", band: "var(--chart-value-band)" },
  { line: "var(--chart-cost)", band: "var(--chart-cost-band)" },
  { line: "var(--chart-net)", band: "var(--chart-net)" },
];
