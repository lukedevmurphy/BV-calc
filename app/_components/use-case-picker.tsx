"use client";

import { useState } from "react";
import type { UseCase, UseCaseTag, ValueApproach } from "@/lib/types";
import { INDUSTRIES, useCasesByIndustry } from "@/lib/data/use-cases";
import { driversForUseCase, VALUE_DRIVERS, type DriverId } from "@/lib/value-model/drivers";
import { ranged } from "@/lib/economics/ranged";
import { FieldLabel, RangedField } from "./inputs";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** User-created use cases (persisted on the proposal). */
  customUseCases: UseCase[];
  onCustomChange: (ucs: UseCase[]) => void;
  /** When "top_down", show the per-use-case value-tier control. */
  approach?: ValueApproach;
  /** Top-down per-use-case allocation weights (keyed by id). */
  weights?: Record<string, number>;
  onWeight?: (id: string, weight: number) => void;
  /** Sector default for the industry filter (derived from the confirmed company). */
  initialIndustry?: string;
  /** Most-relevant-first use-case IDs for the sector — shown first. */
  rankedIds?: string[];
}

const TAG_STYLES: Record<string, string> = {
  automation: "bg-[#ede2c8] text-[#7a5d1f]",
  augmentation: "bg-[#e2e7d8] text-[#49533a]",
  agency: "bg-[#f3e2d9] text-[#a8492a]",
  delegation: "bg-[#eae6da] text-[#54534a]",
  description: "bg-[#eae6da] text-[#54534a]",
  discernment: "bg-[#eae6da] text-[#54534a]",
  diligence: "bg-[#eae6da] text-[#54534a]",
};

// Drivers a custom use case may map to (each carries its income-statement
// routing). coding_efficiency / it_takeout are excluded — their own engines
// compute them, so offering them here would double-count.
const MAPPABLE_DRIVERS: DriverId[] = [
  "productivity",
  "revenue_growth",
  "cross_sell",
  "onboarding_speed",
  "risk_compliance",
];

const TIERS: { label: string; tier: NonNullable<UseCase["topDownTier"]>; weight: number }[] = [
  { label: "High", tier: "high", weight: 3 },
  { label: "Med", tier: "med", weight: 2 },
  { label: "Low", tier: "low", weight: 1 },
];

interface Draft {
  label: string;
  hoursSaved: ReturnType<typeof ranged>;
  instances: ReturnType<typeof ranged>;
  drivers: DriverId[];
  tier: NonNullable<UseCase["topDownTier"]>;
}
const emptyDraft = (): Draft => ({
  label: "",
  hoursSaved: ranged(0.25, 0.5, 1),
  instances: ranged(1, 2, 4),
  drivers: ["productivity"],
  tier: "med",
});

export default function UseCasePicker({
  selectedIds,
  onChange,
  customUseCases,
  onCustomChange,
  approach = "bottom_up",
  weights,
  onWeight,
  initialIndustry,
  rankedIds,
}: Props) {
  const [industry, setIndustry] = useState(initialIndustry ?? INDUSTRIES[0] ?? "");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const rank = (id: string) => {
    const i = (rankedIds ?? []).indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const options = [...useCasesByIndustry(industry)].sort((a, b) => rank(a.id) - rank(b.id));

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );

  const addCustom = () => {
    if (!draft.label.trim() || draft.drivers.length === 0) return;
    const uc: UseCase = {
      id: `custom-${Date.now().toString(36)}`,
      label: draft.label.trim(),
      industry: "Custom",
      hoursSavedPerInstance: draft.hoursSaved,
      instancesPerMonthPerUser: draft.instances,
      drivers: draft.drivers,
      custom: true,
      topDownTier: draft.tier,
    };
    onCustomChange([...customUseCases, uc]);
    onChange([...selectedIds, uc.id]);
    setDraft(emptyDraft());
    setAdding(false);
  };

  const removeCustom = (id: string) => {
    onCustomChange(customUseCases.filter((u) => u.id !== id));
    onChange(selectedIds.filter((x) => x !== id));
  };

  const tierWeight = (id: string) => weights?.[id] ?? 2;
  const toggleDriver = (d: DriverId) =>
    setDraft((s) => ({
      ...s,
      drivers: s.drivers.includes(d) ? s.drivers.filter((x) => x !== d) : [...s.drivers, d],
    }));

  const row = (uc: UseCase, isCustom: boolean) => {
    const checked = selectedIds.includes(uc.id);
    return (
      <label
        key={uc.id}
        className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-colors ${
          checked ? "border-2 border-accent bg-accent-soft" : "border-line-strong bg-canvas hover:border-accent"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(uc.id)}
          className="mt-0.5 accent-[var(--accent)]"
        />
        <span className="flex-1">
          <span className="block text-xs font-medium leading-snug">
            {uc.label}
            {isCustom && <span className="ml-1 text-[9px] font-normal text-ink-tertiary">· custom</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {(uc.tags ?? []).map((t: UseCaseTag) => (
              <span key={t} className={`rounded px-1.5 py-px text-[9px] font-medium ${TAG_STYLES[t] ?? "bg-muted"}`}>
                {t}
              </span>
            ))}
            <span className="text-[9px] uppercase tracking-wide text-ink-tertiary">drives</span>
            {driversForUseCase(uc).map((d) => (
              <span
                key={d}
                title={VALUE_DRIVERS[d].label}
                className="rounded border border-line-strong px-1.5 py-px text-[9px] font-medium text-ink-secondary"
              >
                {VALUE_DRIVERS[d].short}
              </span>
            ))}
          </span>
          {approach === "top_down" && checked && onWeight && (
            <span className="mt-1.5 flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-wide text-ink-tertiary">value tier</span>
              {TIERS.map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onWeight(uc.id, t.weight);
                  }}
                  className={`rounded px-1.5 py-px text-[9px] font-medium transition ${
                    tierWeight(uc.id) === t.weight
                      ? "bg-accent text-white"
                      : "border border-line-strong text-ink-secondary hover:border-accent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </span>
          )}
        </span>
        {isCustom && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              removeCustom(uc.id);
            }}
            title="Remove custom use case"
            className="text-ink-tertiary hover:text-red-600"
          >
            ×
          </button>
        )}
      </label>
    );
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Use cases</h2>
        <span className="text-[11px] text-ink-tertiary">{selectedIds.length} selected</span>
      </div>

      <label className="mt-2 block">
        <FieldLabel>Industry</FieldLabel>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="mt-1 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm"
        >
          {INDUSTRIES.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </label>

      <div className="mt-2 space-y-1.5">{options.map((uc) => row(uc, false))}</div>

      {customUseCases.length > 0 && (
        <div className="mt-3">
          <FieldLabel>Custom use cases</FieldLabel>
          <div className="mt-1 space-y-1.5">{customUseCases.map((uc) => row(uc, true))}</div>
        </div>
      )}

      {/* Add a custom use case */}
      <div className="mt-3">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-md border border-dashed border-line-strong px-3 py-2 text-xs font-medium text-ink-secondary hover:border-accent hover:text-accent"
          >
            + Add custom use case
          </button>
        ) : (
          <div className="space-y-3 rounded-md border border-line-strong bg-surface p-3">
            <label className="block">
              <FieldLabel>Use case name</FieldLabel>
              <input
                type="text"
                value={draft.label}
                placeholder="e.g. Contract review & abstraction"
                onChange={(e) => setDraft((s) => ({ ...s, label: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-sm"
              />
            </label>

            <div>
              <FieldLabel help="Which value driver(s) this use case feeds — each carries its income-statement routing.">
                How does it create value? (pick one or more)
              </FieldLabel>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {MAPPABLE_DRIVERS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDriver(d)}
                    title={VALUE_DRIVERS[d].outcomeLabel}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                      draft.drivers.includes(d)
                        ? "bg-accent text-white"
                        : "border border-line-strong text-ink-secondary hover:border-accent"
                    }`}
                  >
                    {VALUE_DRIVERS[d].short}
                  </button>
                ))}
              </div>
            </div>

            <RangedField
              label="Hours saved / instance"
              value={draft.hoursSaved}
              step={0.25}
              onChange={(hoursSaved) => setDraft((s) => ({ ...s, hoursSaved }))}
            />
            <RangedField
              label="Instances / user / month"
              value={draft.instances}
              step={1}
              onChange={(instances) => setDraft((s) => ({ ...s, instances }))}
            />

            <div>
              <FieldLabel help="Top-down value tier — how big a slice of the directional envelope this use case gets.">
                Top-down value tier
              </FieldLabel>
              <div className="mt-1 flex gap-1">
                {TIERS.map((t) => (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => setDraft((s) => ({ ...s, tier: t.tier }))}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                      draft.tier === t.tier
                        ? "bg-accent text-white"
                        : "border border-line-strong text-ink-secondary hover:border-accent"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addCustom}
                disabled={!draft.label.trim() || draft.drivers.length === 0}
                className="flex-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraft(emptyDraft());
                }}
                className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
