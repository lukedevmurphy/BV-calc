import Link from "next/link";
import { auth } from "@/auth";
import { getDb } from "@/db/client";
import { proposals } from "@/db/schema";
import { aggregateProposalAnalytics, type ProposalAnalytics, type SegmentBucket } from "@/lib/analytics/proposals";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { isAdminEmail } from "@/lib/auth/admin";
import { SignInButton, SignOutButton } from "./auth-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) return <SignInScreen />;
  if (!isAdminEmail(session.user.email)) return <UnauthorizedScreen />;

  const result = await loadAnalytics();
  return (
    <main className="min-h-screen pb-16">
      <header className="border-b border-line bg-canvas/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              Private analytics
            </p>
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              Business case portfolio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-tertiary sm:inline">{session.user.email}</span>
            <Link href="/" className="text-xs font-medium text-ink-secondary hover:text-accent">
              Builder
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {result.error ? (
          <DataError message={result.error} />
        ) : (
          <Dashboard analytics={result.analytics!} />
        )}
      </div>
    </main>
  );
}

async function loadAnalytics(): Promise<{ analytics?: ProposalAnalytics; error?: string }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: proposals.id,
        companyName: proposals.companyName,
        payload: proposals.payload,
        createdAt: proposals.createdAt,
        updatedAt: proposals.updatedAt,
      })
      .from(proposals);
    return { analytics: aggregateProposalAnalytics(rows) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The analytics database could not be read.",
    };
  }
}

function SignInScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Private analytics</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Sign in to review the portfolio.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Access is restricted to the configured administrator Google account.
        </p>
        <div className="mt-6"><SignInButton /></div>
        <Link href="/" className="mt-5 inline-block text-sm text-ink-secondary hover:text-accent">
          Return to builder
        </Link>
      </section>
    </main>
  );
}

function UnauthorizedScreen() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="font-serif text-3xl font-semibold">Not authorized</h1>
      <p className="mt-3 text-sm text-ink-secondary">This account cannot access proposal analytics.</p>
      <div className="mt-6"><SignOutButton /></div>
    </main>
  );
}

function Dashboard({ analytics }: { analytics: ProposalAnalytics }) {
  const { summary } = analytics;
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Business cases" value={fmtNumber(summary.caseCount)} />
        <Metric label="Annual value" value={fmtCurrency(summary.totalValue)} tone="value" />
        <Metric label="Annual cost" value={fmtCurrency(summary.totalCost)} tone="cost" />
        <Metric label="Net value" value={fmtCurrency(summary.totalNet)} tone="net" />
        <Metric label="Average case value" value={fmtCurrency(summary.averageValue)} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
        <SectionHeading title="Value and cost over time" subtitle="Cases grouped by creation month · latest 12 active months" />
        {analytics.timeline.length ? (
          <div className="mt-5 space-y-3">
            {analytics.timeline.map((month) => (
              <TimelineRow key={month.key} month={month} max={Math.max(...analytics.timeline.flatMap((m) => [m.totalValue, m.totalCost]), 1)} />
            ))}
          </div>
        ) : <EmptyState />}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SegmentTable title="By industry" rows={analytics.byIndustry} />
        <SegmentTable title="By region" rows={analytics.byRegion} />
        <SegmentTable title="By country" rows={analytics.byCountry} />
        <SegmentTable title="By headquarters" rows={analytics.byHeadquarters} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
        <SectionHeading title="Recently updated cases" subtitle="Latest 10 saved proposals" />
        {analytics.recentCases.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-line-strong text-left text-xs text-ink-tertiary">
                <th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Industry</th>
                <th className="py-2 pr-4">Region / HQ</th><th className="py-2 pr-4 text-right">Value</th>
                <th className="py-2 pr-4 text-right">Cost</th><th className="py-2 text-right">Updated</th>
              </tr></thead>
              <tbody>{analytics.recentCases.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 font-medium">{item.companyName}</td>
                  <td className="py-3 pr-4 text-ink-secondary">{item.industry}</td>
                  <td className="py-3 pr-4 text-ink-secondary">{item.region} · {item.headquarters}</td>
                  <td className="py-3 pr-4 text-right font-medium text-[var(--chart-value)]">{fmtCurrency(item.value)}</td>
                  <td className="py-3 pr-4 text-right text-accent">{fmtCurrency(item.cost)}</td>
                  <td className="py-3 text-right text-ink-tertiary">{item.updatedAt.toLocaleDateString("en-US")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState />}
      </section>

      {analytics.skippedRows > 0 && (
        <p className="text-xs text-amber-700">{analytics.skippedRows} malformed saved row(s) were excluded.</p>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "value" | "cost" | "net" }) {
  const color = tone === "value" ? "text-[var(--chart-value)]" : tone === "cost" ? "text-accent" : tone === "net" ? "text-[var(--chart-net)]" : "text-ink";
  return <div className="rounded-xl border border-line bg-surface p-4 shadow-card"><div className={`font-serif text-2xl font-semibold ${color}`}>{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">{label}</div></div>;
}

function TimelineRow({ month, max }: { month: ProposalAnalytics["timeline"][number]; max: number }) {
  return <div className="grid grid-cols-[72px_minmax(0,1fr)_96px] items-center gap-3 text-xs">
    <span className="font-medium text-ink-secondary">{month.label}</span>
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-[var(--chart-value)]" style={{ width: `${Math.max(1, month.totalValue / max * 100)}%` }} /></div>
      <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-accent-bright" style={{ width: `${Math.max(1, month.totalCost / max * 100)}%` }} /></div>
    </div>
    <span className="text-right text-ink-tertiary">{month.caseCount} · {fmtCurrency(month.totalValue)}</span>
  </div>;
}

function SegmentTable({ title, rows }: { title: string; rows: SegmentBucket[] }) {
  return <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
    <SectionHeading title={title} subtitle="Projected annual base case" />
    {rows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="border-b border-line-strong text-left text-xs text-ink-tertiary"><th className="py-2 pr-3">Segment</th><th className="py-2 pr-3 text-right">Cases</th><th className="py-2 pr-3 text-right">Value</th><th className="py-2 text-right">Net</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label} className="border-b border-line last:border-0"><td className="py-2.5 pr-3 font-medium">{row.label}</td><td className="py-2.5 pr-3 text-right text-ink-secondary">{row.caseCount}</td><td className="py-2.5 pr-3 text-right text-ink-secondary">{fmtCurrency(row.totalValue)}</td><td className="py-2.5 text-right font-medium">{fmtCurrency(row.totalNet)}</td></tr>)}</tbody>
    </table></div> : <EmptyState />}
  </section>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="font-serif text-xl font-semibold tracking-tight">{title}</h2><p className="mt-0.5 text-xs text-ink-tertiary">{subtitle}</p></div>;
}

function EmptyState() { return <p className="mt-4 rounded-lg bg-muted px-4 py-6 text-center text-sm text-ink-tertiary">No saved business cases yet.</p>; }
function DataError({ message }: { message: string }) { return <section className="rounded-xl border border-red-200 bg-red-50 p-5"><h2 className="font-semibold text-red-900">Analytics unavailable</h2><p className="mt-1 text-sm text-red-700">{message}</p></section>; }
