"use client";

import type { ModelMixEntry } from "@/lib/types";
import { FieldLabel } from "./inputs";

interface Props {
  mix: ModelMixEntry[];
  onChange: (mix: ModelMixEntry[]) => void;
}

/**
 * Fully user-editable model mix — labels, prices, and shares are placeholder
 * data (see lib/data/defaults.ts TODO); nothing downstream references a model
 * name. Warns when shares don't sum to 100%.
 */
export default function ModelMixEditor({ mix, onChange }: Props) {
  const totalShare = mix.reduce((acc, m) => acc + m.sharePct, 0);

  const set = (id: string, patch: Partial<ModelMixEntry>) => {
    onChange(mix.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const num = (v: number) => (Number.isFinite(v) ? v : 0);

  return (
    <div>
      <FieldLabel>Model mix (editable — confirm current pricing)</FieldLabel>
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-[1fr_56px_56px_52px] gap-1.5 text-[10px] text-ink-tertiary">
          <span>Model</span>
          <span>$ in/MTok</span>
          <span>$ out/MTok</span>
          <span>Share %</span>
        </div>
        {mix.map((m) => (
          <div key={m.id}>
            <div className="grid grid-cols-[1fr_56px_56px_52px] gap-1.5">
              <input
                type="text"
                value={m.label}
                onChange={(e) => set(m.id, { label: e.target.value })}
                className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs"
              />
              <input
                type="number"
                value={m.inputPricePerMTok}
                min={0}
                step={0.25}
                placeholder={m.restricted ? "TBD" : undefined}
                onChange={(e) => set(m.id, { inputPricePerMTok: num(e.target.valueAsNumber) })}
                className={`rounded-md border px-1.5 py-1 text-xs ${
                  m.restricted ? "border-dashed border-line-strong bg-muted" : "border-line bg-surface"
                }`}
              />
              <input
                type="number"
                value={m.outputPricePerMTok}
                min={0}
                step={0.25}
                placeholder={m.restricted ? "TBD" : undefined}
                onChange={(e) => set(m.id, { outputPricePerMTok: num(e.target.valueAsNumber) })}
                className={`rounded-md border px-1.5 py-1 text-xs ${
                  m.restricted ? "border-dashed border-line-strong bg-muted" : "border-line bg-surface"
                }`}
              />
              <input
                type="number"
                value={m.sharePct}
                min={0}
                max={100}
                step={5}
                onChange={(e) => set(m.id, { sharePct: num(e.target.valueAsNumber) })}
                className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs"
              />
            </div>
            {m.restricted && m.priceNote && (
              <p className="mt-1 rounded bg-accent-soft px-1.5 py-1 text-[10px] font-medium text-accent">
                {m.label} — {m.priceNote}
              </p>
            )}
          </div>
        ))}
      </div>
      {Math.round(totalShare) !== 100 && (
        <p className="mt-1.5 text-[11px] font-medium text-red-600">
          Shares sum to {Math.round(totalShare)}% — should be 100%
        </p>
      )}
    </div>
  );
}
