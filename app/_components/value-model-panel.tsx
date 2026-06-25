"use client";

import type { ValueModelInputs } from "@/lib/types";
import type { SubIndustry } from "@/lib/value-model/sub-industry";
import { FieldLabel, NumberField, RangedField } from "./inputs";

export default function ValueModelPanel({
  valueModel: vm,
  subIndustry,
  onValueModelChange,
}: {
  valueModel: ValueModelInputs;
  subIndustry: SubIndustry;
  onValueModelChange: (value: ValueModelInputs) => void;
}) {
  const patch = (value: Partial<ValueModelInputs>) => onValueModelChange({ ...vm, ...value });
  const setCost = (year: number, value: number) =>
    patch({
      topDownAnnualCosts: {
        ...vm.topDownAnnualCosts,
        [String(year)]: Math.max(0, value),
      },
    });
  const v = subIndustry.topDown;
  const pct = (x?: number) => (typeof x === "number" ? Number((x * 100).toFixed(2)) : "");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Top-down directional estimate
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">Set the CFO-level value thesis</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          A low-data SWAG from public financials: how much AI lifts the company&apos;s
          revenue-growth rate. The total is broken across the use cases you pick (by value
          tier) and carries a wide confidence band by design.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <NumberField label={v.toplineLabel} value={vm.topline} step={1_000_000} prefix="$" format="currency" onChange={(topline) => patch({ topline })} />
            <label className="mt-1.5 block">
              <FieldLabel help="Where this figure came from — IR site, 10-K/10-Q, earnings call, or an AI lookup. Leave blank to flag it as unverified.">
                Topline source
              </FieldLabel>
              <input
                value={vm.toplineSource ?? ""}
                onChange={(event) => patch({ toplineSource: event.target.value })}
                placeholder="IR / SEC filing / public comment — or leave blank to verify"
                className="mt-1 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel help="The company's current annual revenue growth rate (from public financials).">
                Current revenue growth (%)
              </FieldLabel>
              <input
                type="number"
                value={pct(vm.topDownGrowthBaseline)}
                step={1}
                min={0}
                placeholder="10"
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  patch({ topDownGrowthBaseline: Number.isFinite(n) ? n / 100 : undefined });
                }}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <FieldLabel help="The growth rate AI helps the company reach, e.g. 10% → 12%. The directional value is topline × (lifted − current) × realization.">
                AI-lifted growth (%)
              </FieldLabel>
              <input
                type="number"
                value={pct(vm.topDownGrowthLifted)}
                step={1}
                min={0}
                placeholder="12"
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  patch({ topDownGrowthLifted: Number.isFinite(n) ? n / 100 : undefined });
                }}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <RangedField label={v.realizationLabel} value={vm.realizationFactor} step={0.05} format="percent" help={v.realizationHelp} onChange={(realizationFactor) => patch({ realizationFactor })} />

          <label className="block">
            <FieldLabel>Growth-lift rationale / source</FieldLabel>
            <input
              value={vm.upliftSource ?? ""}
              onChange={(event) => patch({ upliftSource: event.target.value })}
              placeholder="Benchmark, peer comparison, or uncited — verify"
              className="mt-1 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">Optional annual cost SWAG</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Leave every year at $0 for a value-only CFO story. Enter direct annual costs only when
          the AE has a credible estimate to offset against value. Enter the base estimate; the
          forecast displays a ±25% cost confidence band.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((year) => (
            <NumberField key={year} label={`Year ${year} annual cost`} value={vm.topDownAnnualCosts[String(year)] ?? 0} min={0} step={25_000} prefix="$" format="currency" onChange={(value) => setCost(year, value)} />
          ))}
        </div>
      </section>
    </div>
  );
}
