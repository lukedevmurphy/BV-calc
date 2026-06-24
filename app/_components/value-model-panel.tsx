"use client";

import { useState } from "react";
import type { ValueModelInputs } from "@/lib/types";
import type { SubIndustry } from "@/lib/value-model/sub-industry";
import { FieldLabel, NumberField, RangedField } from "./inputs";

const FUNCTION_OPTIONS = [
  "Sales & marketing",
  "Engineering / coding",
  "Employee productivity",
  "Operations",
  "Finance",
  "Risk & compliance",
  "Customer service",
  "HR",
];

export default function ValueModelPanel({
  valueModel: vm,
  subIndustry,
  onValueModelChange,
}: {
  valueModel: ValueModelInputs;
  subIndustry: SubIndustry;
  onValueModelChange: (value: ValueModelInputs) => void;
}) {
  const [custom, setCustom] = useState("");
  const patch = (value: Partial<ValueModelInputs>) => onValueModelChange({ ...vm, ...value });
  const selected = vm.topDownFunctions;
  const toggle = (label: string) =>
    patch({
      topDownFunctions: selected.includes(label)
        ? selected.filter((item) => item !== label)
        : [...selected, label],
    });
  const setCost = (year: number, value: number) =>
    patch({
      topDownAnnualCosts: {
        ...vm.topDownAnnualCosts,
        [String(year)]: Math.max(0, value),
      },
    });
  const v = subIndustry.topDown;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Top-down directional estimate
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">Set the CFO-level value thesis</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          This is a directional SWAG from company-level figures. It does not use workflows or
          use cases, and carries a wider confidence band by design.
        </p>

        <div className="mt-5 space-y-4">
          <RangedField label={v.toplineLabel} value={vm.topline} step={1_000_000} prefix="$" format="currency" help={v.toplineHelp} onChange={(topline) => patch({ topline })} />
          <RangedField label={v.addressableLabel} value={vm.addressableShare} step={0.05} format="percent" help={v.addressableHelp} onChange={(addressableShare) => patch({ addressableShare })} />
          <RangedField label={v.upliftLabel} value={vm.upliftPct} step={0.05} format="percent" help={v.upliftHelp} onChange={(upliftPct) => patch({ upliftPct })} />
          <RangedField label={v.realizationLabel} value={vm.realizationFactor} step={0.05} format="percent" help={v.realizationHelp} onChange={(realizationFactor) => patch({ realizationFactor })} />
          <label className="block">
            <FieldLabel>Uplift source / rationale</FieldLabel>
            <input
              value={vm.upliftSource ?? ""}
              onChange={(event) => patch({ upliftSource: event.target.value })}
              placeholder="Benchmark, client estimate, or uncited — verify"
              className="mt-1 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">Where does the value come from?</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Select high-level functional pools. The directional value is allocated evenly across
          them; these shape the story, not the underlying use-case math.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCTION_OPTIONS.map((label) => {
            const active = selected.includes(label);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(label)}
                className={`min-h-11 rounded-lg border-2 px-3 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "border-accent bg-accent-soft text-ink" : "border-line-strong bg-canvas text-ink-secondary hover:border-accent"}`}
              >
                {active ? "✓ " : "+ "}{label}
              </button>
            );
          })}
          {selected.filter((label) => !FUNCTION_OPTIONS.includes(label)).map((label) => (
            <button key={label} type="button" onClick={() => toggle(label)} className="min-h-11 rounded-lg border-2 border-accent bg-accent-soft px-3 py-2 text-left text-sm font-medium">✓ {label}</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Add a custom function" className="min-w-0 flex-1 rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          <button type="button" disabled={!custom.trim()} onClick={() => { const label = custom.trim(); if (label && !selected.includes(label)) patch({ topDownFunctions: [...selected, label] }); setCustom(""); }} className="rounded-lg border border-line-strong bg-canvas px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40">Add</button>
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
