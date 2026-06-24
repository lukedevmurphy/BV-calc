"use client";

import { useState } from "react";
import type { UseCaseTag } from "@/lib/types";
import { INDUSTRIES, useCasesByIndustry } from "@/lib/data/use-cases";
import { driversForUseCase, VALUE_DRIVERS } from "@/lib/value-model/drivers";
import { FieldLabel } from "./inputs";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Sector default for the industry filter (derived from the confirmed
   *  company). Falls back to the first catalog industry when unset. */
  initialIndustry?: string;
  /** Most-relevant-first use-case IDs for the sector — shown first. */
  rankedIds?: string[];
}

// Template-palette chips: modes get distinct hues (gold / sage / clay), the
// 4 D's competency lens shares a neutral cream. (Text darkened for WCAG AA.)
const TAG_STYLES: Record<string, string> = {
  automation: "bg-[#ede2c8] text-[#7a5d1f]",
  augmentation: "bg-[#e2e7d8] text-[#49533a]",
  agency: "bg-[#f3e2d9] text-[#a8492a]",
  delegation: "bg-[#eae6da] text-[#54534a]",
  description: "bg-[#eae6da] text-[#54534a]",
  discernment: "bg-[#eae6da] text-[#54534a]",
  diligence: "bg-[#eae6da] text-[#54534a]",
};

/** Industry-filtered use-case selection with automation/augmentation/agency
 *  and 4 D's tag badges. The industry filter and the order of the list both
 *  follow the confirmed company's sub-industry (initialIndustry / rankedIds). */
export default function UseCasePicker({
  selectedIds,
  onChange,
  initialIndustry,
  rankedIds,
}: Props) {
  const [industry, setIndustry] = useState(
    initialIndustry ?? INDUSTRIES[0] ?? "",
  );
  // Pre-rank: sector's ranked use cases first (in rank order), then the rest.
  const rank = (id: string) => {
    const i = (rankedIds ?? []).indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const options = [...useCasesByIndustry(industry)].sort(
    (a, b) => rank(a.id) - rank(b.id),
  );

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

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

      <div className="mt-2 space-y-1.5">
        {options.map((uc) => {
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
              <span>
                <span className="block text-xs font-medium leading-snug">{uc.label}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  {(uc.tags ?? []).map((t: UseCaseTag) => (
                    <span
                      key={t}
                      className={`rounded px-1.5 py-px text-[9px] font-medium ${TAG_STYLES[t] ?? "bg-muted"}`}
                    >
                      {t}
                    </span>
                  ))}
                  {uc.source && (
                    <a
                      href={uc.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={uc.source.label}
                      className="text-[9px] font-medium text-accent underline-offset-2 hover:underline"
                    >
                      source ↗
                    </a>
                  )}
                </span>
                {/* Use-case → value-driver mapping (the value tree's middle layer). */}
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-[9px] uppercase tracking-wide text-ink-tertiary">
                    drives
                  </span>
                  {driversForUseCase(uc.id).map((d) => (
                    <span
                      key={d}
                      title={VALUE_DRIVERS[d].label}
                      className="rounded border border-line-strong px-1.5 py-px text-[9px] font-medium text-ink-secondary"
                    >
                      {VALUE_DRIVERS[d].short}
                    </span>
                  ))}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
