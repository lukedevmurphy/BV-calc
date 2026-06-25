"use client";

import type {
  CodingAssumptions,
  ScenarioAssumptions,
  SectionOutput,
  UseCase,
} from "@/lib/types";
import { FieldLabel, NumberField, RangedField, Slider } from "../inputs";
import RampEditor from "../ramp-editor";
import ModelMixEditor from "../model-mix-editor";
import TokenModelEditor from "../token-model-editor";
import CodingEditor from "../coding-editor";
import {
  DEFAULT_CODING,
  DEFAULT_USE_CASE_COVERAGE,
  DEFAULT_VALUE_REALIZATION,
} from "@/lib/data/defaults";
import { valueRealization } from "@/lib/economics/engine";
import { fmtCurrency } from "@/lib/format";

interface Props {
  assumptions: ScenarioAssumptions;
  onAssumptions: (a: ScenarioAssumptions) => void;
  /** Computed sections — used to show the live value composition. */
  sections: SectionOutput[];
  selectedUseCases: UseCase[];
  onBack: () => void;
}

const PRESETS = [
  { label: "Offset (cost-out)", value: 0 },
  { label: "Blend", value: 0.6 },
  { label: "Capacity (reinvest)", value: 1 },
];

const CODING_PRESETS = [
  { label: "100% revenue", value: 0 },
  { label: "Blend", value: 0.5 },
  { label: "100% engineering", value: 1 },
];

/**
 * Settings / assumptions — distinct from company identity. Ramp assumptions,
 * top-line → value-driver conversion ratios, and the reinvestment toggle (the
 * contested assumption that RE-ROUTES value to a different financial outcome).
 */
export default function SettingsScreen({
  assumptions,
  onAssumptions,
  sections,
  selectedUseCases,
  onBack,
}: Props) {
  const patch = (p: Partial<ScenarioAssumptions>) => onAssumptions({ ...assumptions, ...p });
  const cap = assumptions.reinvestmentCapacity ?? 0.6;
  const capPct = Math.round(cap * 100);
  const coverage = assumptions.useCaseCoverage ?? DEFAULT_USE_CASE_COVERAGE;
  const coveragePct = Math.round(coverage * 100);
  // The blended realization rate at the current posture — shown live so the user
  // sees the realized total move as they slide the toggle / edit the rates.
  const realizedPct = Math.round(valueRealization(assumptions).base * 100);
  const approach = assumptions.valueApproach ?? "bottom_up";

  // Live composition: the Business Value section already routes value to
  // outcomes by this posture — surface its "→ outcome" stats here so the user
  // sees the composition shift as they move the toggle.
  const bv = sections.find((s) => s.kind === "business_value");
  const composition = (bv?.stats ?? []).filter((s) => s.label.startsWith("→"));
  const valueTotal = bv?.rangedFigures?.annualValueFinalYear?.base;

  // Coding-efficiency driver: its own allocation slider + live composition,
  // read from the coding section (which routes its split by this allocation).
  const coding: CodingAssumptions = assumptions.coding ?? DEFAULT_CODING;
  const codingAllocPct = Math.round(Math.min(1, Math.max(0, coding.allocation)) * 100);
  const patchCoding = (p: Partial<CodingAssumptions>) =>
    patch({ coding: { ...DEFAULT_CODING, ...assumptions.coding, ...p } });
  const codingSec = sections.find((s) => s.kind === "coding_efficiency");
  const codingComposition = (codingSec?.stats ?? []).filter((s) => s.label.startsWith("→"));
  const codingTotal = codingSec?.rangedFigures?.codingTotalFinalYear?.base;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            Assumptions &amp; settings
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            The contested assumptions, in one place. Company identity is edited from the
            top bar — this page is the economic posture.
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          ← Back
        </button>
      </div>

      {/* Presentation mode — gates internal credibility warnings */}
      <section className="mb-6 rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">Presentation mode</h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
          <span className="font-medium">Draft</span> shows internal credibility warnings
          (implausible-ratio ⚠, the illustrative-seed flag, the illustrative-goals caveat) for
          your review. <span className="font-medium">Client-facing</span> suppresses them for the
          client deck and drops the “draft for discussion” footer. Default: Draft.
        </p>
        <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1">
          {([
            { value: "draft", label: "Draft (internal)" },
            { value: "client", label: "Client-facing" },
          ] as const).map((m) => {
            const active = (assumptions.presentationMode ?? "draft") === m.value;
            return (
              <button
                key={m.value}
                onClick={() => patch({ presentationMode: m.value })}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                  active ? "bg-surface text-ink shadow-card" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Reinvestment toggle — the headline assumption */}
      {approach === "bottom_up" && <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">How is freed time realized?</h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
          The single most-contested assumption. It sets <span className="font-medium">both</span> the
          financial outcome AND the realized total — a freed hour is only a dollar if it is actually
          monetized or cut. <span className="font-medium">Capacity</span> (reinvest) sends value to
          revenue / production and realizes <span className="font-medium">less</span> (speculative);{" "}
          <span className="font-medium">Offset</span> (cost-out) sends it to operating margin and
          realizes more. Moving the toggle changes the dollar total, not just its label.
        </p>

        <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1">
          {PRESETS.map((p) => {
            const active = Math.abs(cap - p.value) < 0.001;
            return (
              <button
                key={p.label}
                onClick={() => patch({ reinvestmentCapacity: p.value })}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                  active ? "bg-surface text-ink shadow-card" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
            <span>Offset / cost-out</span>
            <span className="font-medium text-ink-secondary">
              {capPct}% capacity / {100 - capPct}% offset
            </span>
            <span>Capacity / reinvest</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cap}
            onChange={(e) => patch({ reinvestmentCapacity: e.target.valueAsNumber })}
            className="mt-1 w-full accent-[var(--accent)]"
          />
        </div>

        {composition.length > 0 && (
          <div className="mt-4">
            <FieldLabel>Value composition at this posture (Year {assumptions.horizonYears})</FieldLabel>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {composition.map((c) => (
                <div key={c.label} className="rounded-lg border border-line bg-canvas px-3 py-2">
                  <div className="text-[11px] text-ink-tertiary">{c.label}</div>
                  <div className="mt-0.5 font-serif text-sm font-semibold">{c.value}</div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-tertiary">
              At this posture ~{realizedPct}% of freed hours are realized as dollars
              {valueTotal !== undefined && (
                <> → realized annual value (Y{assumptions.horizonYears}) ≈ {fmtCurrency(valueTotal)}</>
              )}
              . Move the toggle and both the total and the composition shift.
            </p>
          </div>
        )}
      </section>}

      {/* Value realization — the saved-hours → dollars haircut (value-realism fix) */}
      {approach === "bottom_up" && <section className="mt-6 rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">Value realization &amp; coverage</h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
          Saved hours are not dollars at full freight. These editable estimates turn the gross
          bottom-up saved-hours into a defensible realized value — the fix that keeps the
          value-to-cost ratio credible. Blended realization at the current posture:{" "}
          <span className="font-medium text-ink">~{realizedPct}%</span>.
        </p>
        <div className="mt-3 space-y-3">
          <RangedField
            label="Offset realization — freed hours → avoided cost (%)"
            value={assumptions.offsetRealization ?? DEFAULT_VALUE_REALIZATION.offset}
            step={0.05}
            format="percent"
            help="The percentage of freed hours that becomes actual avoided cost through reduced spend, attrition absorption, or headcount avoidance."
            onChange={(r) => patch({ offsetRealization: r })}
          />
          <RangedField
            label="Capacity realization — freed capacity → monetized output (%)"
            value={assumptions.capacityRealization ?? DEFAULT_VALUE_REALIZATION.capacity}
            step={0.05}
            format="percent"
            help="The percentage of freed capacity expected to produce measurable revenue or output. It is usually lower because reinvested time is less directly captured than cost-out."
            onChange={(r) => patch({ capacityRealization: r })}
          />
          <div>
            <FieldLabel>
              Persona coverage — share of selected workflows a typical adopter runs ({coveragePct}%)
            </FieldLabel>
            <Slider
              value={coverage}
              min={0}
              max={1}
              step={0.05}
              onChange={(useCaseCoverage) => patch({ useCaseCoverage })}
            />
            <p className="mt-1 text-[11px] text-ink-tertiary">
              The bottom-up sum credits every adopter with every selected use case; in reality the
              workflows map to distinct personas, so a typical adopter runs only a subset (~1 of N).
            </p>
          </div>
        </div>
      </section>}

      {/* Coding capacity allocation — the coding-efficiency driver (both approaches) */}
      <section className="mt-6 rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">Coding capacity allocation</h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
          Coding is the #1 AI use case. Freed engineering capacity lands in one of two places:{" "}
          <span className="font-medium">Engineering</span> cost-out books freed hours as avoided
          cost; <span className="font-medium">Revenue</span> reinvests the same capacity to lift the
          baseline growth rate. The split is a posture — slide it and the composition (and the
          blended total) move.
        </p>

        <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1">
          {CODING_PRESETS.map((p) => {
            const active = Math.abs(coding.allocation - p.value) < 0.001;
            return (
              <button
                key={p.label}
                onClick={() => patchCoding({ allocation: p.value })}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                  active ? "bg-surface text-ink shadow-card" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
            <span>100% revenue growth</span>
            <span className="font-medium text-ink-secondary">
              {codingAllocPct}% cost-out / {100 - codingAllocPct}% growth
            </span>
            <span>100% engineering cost-out</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={coding.allocation}
            onChange={(e) => patchCoding({ allocation: e.target.valueAsNumber })}
            className="mt-1 w-full accent-[var(--accent)]"
          />
        </div>

        {codingComposition.length > 0 && (
          <div className="mt-4">
            <FieldLabel>Coding value composition (Year {assumptions.horizonYears})</FieldLabel>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {codingComposition.map((c) => (
                <div key={c.label} className="rounded-lg border border-line bg-canvas px-3 py-2">
                  <div className="text-[11px] text-ink-tertiary">{c.label}</div>
                  <div className="mt-0.5 font-serif text-sm font-semibold">{c.value}</div>
                </div>
              ))}
            </div>
            {codingTotal !== undefined && (
              <p className="mt-1.5 text-[11px] text-ink-tertiary">
                Blended coding value (Y{assumptions.horizonYears}) ≈ {fmtCurrency(codingTotal)} —
                folded into the headline. Move the slider and value shifts between cost-out and
                growth.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <FieldLabel>Coding driver inputs</FieldLabel>
          <div className="mt-2">
            <CodingEditor coding={coding} onChange={(c) => patch({ coding: c })} />
          </div>
        </div>
      </section>

      {/* Ramp assumptions */}
      <section className="mt-6 rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">Ramp assumptions</h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
          The single editing location for the adoption and consumption forecast.
        </p>
        <div className="mt-3 space-y-5">
          <RampEditor
            label="Adoption breadth (% of target users active)"
            mode="percent"
            points={assumptions.adoptionBreadth}
            onChange={(adoptionBreadth) => patch({ adoptionBreadth })}
          />
          {approach === "bottom_up" && <RampEditor label="Usage depth (consumption multiplier per adopter)" mode="multiplier" points={assumptions.usageDepth} onChange={(usageDepth) => patch({ usageDepth })} />}
        </div>
      </section>

      {approach === "bottom_up" && (
        <section className="mt-6 rounded-xl border border-line-strong bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold">Bottom-up cost model &amp; overrides</h2>
          <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
            Token economics calculate annual cost by default. Enter a direct annual override
            for any year to replace the modeled figure with an AE-provided SWAG.
          </p>
          <div className="mt-4 space-y-5">
            <ModelMixEditor mix={assumptions.modelMix} onChange={(modelMix) => patch({ modelMix })} />
            <TokenModelEditor assumptions={assumptions} selectedUseCases={selectedUseCases} onChange={onAssumptions} />
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((year) => (
                <NumberField key={year} label={`Year ${year} override ($0 = modeled)`} value={assumptions.annualCostOverrides?.[String(year)] ?? 0} min={0} step={25_000} prefix="$" format="currency" onChange={(value) => patch({ annualCostOverrides: { ...(assumptions.annualCostOverrides ?? {}), [String(year)]: Math.max(0, value) } })} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-line-strong bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold">
          {approach === "bottom_up" ? "Case horizon & enablement" : "Case horizon"}
        </h2>
        <div className={`mt-3 grid gap-4 ${approach === "bottom_up" ? "sm:grid-cols-2" : ""}`}>
          <NumberField label="Horizon (years)" value={assumptions.horizonYears} min={1} step={1} onChange={(horizonYears) => patch({ horizonYears: Math.max(1, Math.min(5, Math.round(horizonYears))) })} />
          {approach === "bottom_up" && <RangedField label="One-time implementation cost" value={assumptions.implementationCost} prefix="$" format="currency" step={25_000} onChange={(implementationCost) => patch({ implementationCost })} />}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onBack}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
