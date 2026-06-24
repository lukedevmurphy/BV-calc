"use client";

import type { Ranged, ScenarioAssumptions, UseCase } from "@/lib/types";
import { tokenDefaultFor } from "@/lib/data/token-defaults";
import { FieldLabel, RangedField } from "./inputs";

interface Props {
  assumptions: ScenarioAssumptions;
  selectedUseCases: UseCase[];
  onChange: (a: ScenarioAssumptions) => void;
}

const fmtTok = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}K`;

/**
 * Per-use-case token-volume editor — the assumed cost driver. Defaults come from
 * the catalog (lib/data/token-defaults), every field is editable, and overrides
 * persist with the proposal (assumptions.tokenOverrides). Estimates, never
 * sourced facts — the basis note says so per use case.
 */
export default function TokenModelEditor({
  assumptions: a,
  selectedUseCases,
  onChange,
}: Props) {
  const tokensFor = (id: string): { input: Ranged; output: Ranged } => {
    const o = a.tokenOverrides?.[id];
    if (o) return o;
    const d = tokenDefaultFor(id);
    return { input: d.input, output: d.output };
  };
  const setTokens = (
    id: string,
    patch: Partial<{ input: Ranged; output: Ranged }>,
  ) => {
    const next = { ...tokensFor(id), ...patch };
    onChange({ ...a, tokenOverrides: { ...(a.tokenOverrides ?? {}), [id]: next } });
  };

  return (
    <div>
      <FieldLabel>Tokens per task — per use case (estimates, editable)</FieldLabel>
      <p className="mt-1 text-[11px] leading-snug text-ink-tertiary">
        Engineering estimates, NOT sourced facts — they vary by docs ingested, caching,
        model, and single-shot vs agentic. Overrides persist with the proposal.
      </p>
      <div className="mt-2 space-y-2">
        {selectedUseCases.map((uc) => {
          const t = tokensFor(uc.id);
          return (
            <details key={uc.id} className="rounded-md border border-line bg-surface p-2">
              <summary className="cursor-pointer select-none text-xs font-medium">
                {uc.label}
                <span className="ml-1 text-[10px] text-ink-tertiary">
                  · {fmtTok(t.input.base)} in / {fmtTok(t.output.base)} out
                </span>
              </summary>
              <p className="mt-1 text-[10px] leading-snug text-ink-tertiary">
                basis: {tokenDefaultFor(uc.id).basis}
              </p>
              <div className="mt-2 space-y-2">
                <RangedField
                  label="Input tokens / task"
                  value={t.input}
                  step={5000}
                  onChange={(input) => setTokens(uc.id, { input })}
                />
                <RangedField
                  label="Output tokens / task"
                  value={t.output}
                  step={1000}
                  onChange={(output) => setTokens(uc.id, { output })}
                />
              </div>
            </details>
          );
        })}
        {selectedUseCases.length === 0 && (
          <p className="text-[11px] text-ink-tertiary">
            Select use cases to set their token volumes.
          </p>
        )}
      </div>
    </div>
  );
}
