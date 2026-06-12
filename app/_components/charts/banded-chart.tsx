"use client";

import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BandedSeries } from "@/lib/types";
import { SERIES_COLORS, tickFormatter } from "./chart-utils";

interface Props {
  series: BandedSeries[];
  /** Optional vertical marker (e.g. break-even x label). */
  referenceX?: string | number;
  referenceLabel?: string;
}

/**
 * Banded funnel chart: shaded [low, high] range area + solid base line per
 * series. Multiple series (value vs cost) merge on x. Animations off so live
 * slider reflow doesn't replay them.
 */
export default function BandedChart({ series, referenceX, referenceLabel }: Props) {
  if (series.length === 0 || series[0].points.length === 0) return null;

  // Merge all series on x. Each series contributes `${i}_band` ([low, high])
  // and `${i}_base` keys.
  const xs = series[0].points.map((p) => p.x);
  const data = xs.map((x, xi) => {
    const row: Record<string, unknown> = { x };
    series.forEach((s, si) => {
      const p = s.points[xi];
      if (p) {
        row[`${si}_band`] = [p.low, p.high];
        row[`${si}_base`] = p.base;
      }
    });
    return row;
  });

  const fmt = tickFormatter(series[0].format);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <XAxis dataKey="x" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            width={64}
          />
          <Tooltip
            formatter={(value, name) => {
              if (Array.isArray(value)) {
                return [`${fmt(Number(value[0]))} – ${fmt(Number(value[1]))}`, name];
              }
              return [fmt(Number(value)), name];
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border-default)",
            }}
          />
          {series.map((s, si) => {
            const color = SERIES_COLORS[si % SERIES_COLORS.length];
            return (
              <Area
                key={`band-${si}`}
                name={`${s.name} (range)`}
                dataKey={`${si}_band`}
                stroke="none"
                fill={color.band}
                fillOpacity={0.35}
                isAnimationActive={false}
              />
            );
          })}
          {series.map((s, si) => {
            const color = SERIES_COLORS[si % SERIES_COLORS.length];
            return (
              <Line
                key={`base-${si}`}
                name={`${s.name} (base)`}
                dataKey={`${si}_base`}
                stroke={color.line}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            );
          })}
          {referenceX !== undefined && (
            <ReferenceLine
              x={referenceX}
              stroke="var(--chart-net)"
              strokeDasharray="4 4"
              label={{
                value: referenceLabel ?? "",
                fontSize: 11,
                fill: "var(--text-secondary)",
                position: "top",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
