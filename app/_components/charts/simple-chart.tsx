"use client";

import {
  Bar,
  BarChart,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "@/lib/types";
import { tickFormatter } from "./chart-utils";

/**
 * Non-ranged data. Category charts (string x, e.g. value by use case) render
 * as horizontal bars so long labels stay readable; numeric x renders as a line.
 */
export default function SimpleChart({ series }: { series: ChartSeries }) {
  if (series.points.length === 0) return null;
  const fmt = tickFormatter(series.format);
  const categorical = typeof series.points[0].x === "string";

  if (categorical) {
    return (
      <div className="w-full" style={{ height: 40 + series.points.length * 44 }}>
        <ResponsiveContainer>
          <BarChart
            data={series.points}
            layout="vertical"
            margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
          >
            <XAxis
              type="number"
              tickFormatter={fmt}
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            />
            <YAxis
              type="category"
              dataKey="x"
              width={210}
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border-default)",
              }}
            />
            <Bar
              dataKey="y"
              name={series.name}
              fill="var(--chart-value)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            >
              {/* The value label is the visible signal that the bars track the
                  sliders: bars scale proportionally so the auto-fit axis hides
                  the change, but the dollar figure here updates live. */}
              <LabelList
                dataKey="y"
                position="right"
                formatter={(v) => fmt(Number(v))}
                style={{ fontSize: 12, fill: "var(--text-secondary)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={series.points} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <XAxis dataKey="x" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            width={64}
          />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Line
            dataKey="y"
            name={series.name}
            stroke="var(--chart-value)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
