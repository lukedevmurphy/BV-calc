import type { ProposalPayload, SectionKind } from "@/lib/types";
import { migrateProposalPayload } from "@/lib/proposals/migrate";

export interface AnalyticsRow {
  id: string;
  companyName: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsSummary {
  caseCount: number;
  totalValue: number;
  totalCost: number;
  totalNet: number;
  averageValue: number;
}

export interface TimeBucket extends AnalyticsSummary {
  key: string;
  label: string;
}

export interface SegmentBucket extends AnalyticsSummary {
  label: string;
}

export interface RecentCase {
  id: string;
  companyName: string;
  industry: string;
  region: string;
  headquarters: string;
  value: number;
  cost: number;
  updatedAt: Date;
}

export interface ProposalAnalytics {
  summary: AnalyticsSummary;
  timeline: TimeBucket[];
  byIndustry: SegmentBucket[];
  byRegion: SegmentBucket[];
  byCountry: SegmentBucket[];
  byHeadquarters: SegmentBucket[];
  recentCases: RecentCase[];
  skippedRows: number;
}

interface CaseMetric {
  id: string;
  companyName: string;
  industry: string;
  region: string;
  country: string;
  headquarters: string;
  value: number;
  cost: number;
  net: number;
  createdAt: Date;
  updatedAt: Date;
}

export function aggregateProposalAnalytics(rows: readonly AnalyticsRow[]): ProposalAnalytics {
  const metrics: CaseMetric[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    try {
      const payload = migrateProposalPayload(row.payload);
      metrics.push(toMetric(row, payload));
    } catch {
      skippedRows += 1;
    }
  }

  return {
    summary: summarize(metrics),
    timeline: groupTimeline(metrics),
    byIndustry: groupBy(metrics, (m) => m.industry),
    byRegion: groupBy(metrics, (m) => m.region),
    byCountry: groupBy(metrics, (m) => m.country),
    byHeadquarters: groupBy(metrics, (m) => m.headquarters),
    recentCases: [...metrics]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10)
      .map((m) => ({
        id: m.id,
        companyName: m.companyName,
        industry: m.industry,
        region: m.region,
        headquarters: m.headquarters,
        value: m.value,
        cost: m.cost,
        updatedAt: m.updatedAt,
      })),
    skippedRows,
  };
}

function toMetric(row: AnalyticsRow, payload: ProposalPayload): CaseMetric {
  const value = rangedBase(payload, "business_value", "annualValueFinalYear");
  const cost = rangedBase(payload, "cost", "annualCostFinalYear");
  return {
    id: row.id,
    companyName: payload.company.name || row.companyName,
    industry: dimension(payload.company.industry),
    region: dimension(payload.company.region),
    country: dimension(payload.company.country),
    headquarters: dimension(payload.company.headquarters),
    value,
    cost,
    net: value - cost,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rangedBase(payload: ProposalPayload, kind: SectionKind, key: string): number {
  const value = payload.sections.find((section) => section.kind === kind)?.rangedFigures?.[key]?.base;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function dimension(value?: string): string {
  return value?.trim() || "Unspecified";
}

function summarize(metrics: readonly Pick<CaseMetric, "value" | "cost" | "net">[]): AnalyticsSummary {
  const totals = metrics.reduce(
    (acc, metric) => ({
      caseCount: acc.caseCount + 1,
      totalValue: acc.totalValue + metric.value,
      totalCost: acc.totalCost + metric.cost,
      totalNet: acc.totalNet + metric.net,
      averageValue: 0,
    }),
    emptySummary(),
  );
  totals.averageValue = totals.caseCount ? totals.totalValue / totals.caseCount : 0;
  return totals;
}

function groupTimeline(metrics: readonly CaseMetric[]): TimeBucket[] {
  const grouped = new Map<string, CaseMetric[]>();
  for (const metric of metrics) {
    const key = metric.createdAt.toISOString().slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), metric]);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, bucket]) => ({
      key,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      ...summarize(bucket),
    }));
}

function groupBy(
  metrics: readonly CaseMetric[],
  getLabel: (metric: CaseMetric) => string,
): SegmentBucket[] {
  const grouped = new Map<string, CaseMetric[]>();
  for (const metric of metrics) {
    const label = getLabel(metric);
    grouped.set(label, [...(grouped.get(label) ?? []), metric]);
  }
  return [...grouped.entries()]
    .map(([label, bucket]) => ({ label, ...summarize(bucket) }))
    .sort((a, b) => b.totalValue - a.totalValue || b.caseCount - a.caseCount);
}

function emptySummary(): AnalyticsSummary {
  return { caseCount: 0, totalValue: 0, totalCost: 0, totalNet: 0, averageValue: 0 };
}
