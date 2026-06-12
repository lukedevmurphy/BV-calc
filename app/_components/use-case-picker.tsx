"use client";

import { useState } from "react";
import type { UseCaseTag } from "@/lib/types";
import { INDUSTRIES, useCasesByIndustry } from "@/lib/data/use-cases";
import { FieldLabel } from "./inputs";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const TAG_STYLES: Record<string, string> = {
  automation: "bg-blue-50 text-blue-700",
  augmentation: "bg-green-50 text-green-700",
  agency: "bg-purple-50 text-purple-700",
  delegation: "bg-amber-50 text-amber-800",
  description: "bg-amber-50 text-amber-800",
  discernment: "bg-amber-50 text-amber-800",
  diligence: "bg-amber-50 text-amber-800",
};

/** Industry-filtered use-case selection with automation/augmentation/agency
 *  and 4 D's tag badges. */
export default function UseCasePicker({ selectedIds, onChange }: Props) {
  const [industry, setIndustry] = useState(INDUSTRIES[0] ?? "");
  const options = useCasesByIndustry(industry);

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
          className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
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
                checked ? "border-accent bg-accent-soft" : "border-line bg-surface"
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
                <span className="mt-1 flex flex-wrap gap-1">
                  {(uc.tags ?? []).map((t: UseCaseTag) => (
                    <span
                      key={t}
                      className={`rounded px-1.5 py-px text-[9px] font-medium ${TAG_STYLES[t] ?? "bg-muted"}`}
                    >
                      {t}
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
