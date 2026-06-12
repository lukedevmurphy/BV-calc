"use client";

import { useState } from "react";
import type { CompanyProfile } from "@/lib/types";
import { SEEDED_COMPANY_NAMES } from "@/lib/enrichment/mock";
import { FieldLabel, NumberField } from "./inputs";

interface Props {
  onConfirm: (profile: CompanyProfile) => void;
  initial?: CompanyProfile;
}

/**
 * Company lookup → ALWAYS an editable confirm step. Verifying the lookup is
 * a feature, not a stopgap: the practitioner exercises discernment before
 * the AI's (currently mocked) research feeds the proposal.
 */
export default function CompanyStep({ onConfirm, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [draft, setDraft] = useState<CompanyProfile | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(lookupName: string) {
    if (!lookupName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: lookupName }),
      });
      if (!res.ok) throw new Error(`lookup failed (${res.status})`);
      setDraft((await res.json()) as CompanyProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "lookup failed");
    } finally {
      setBusy(false);
    }
  }

  const patch = (p: Partial<CompanyProfile>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold">Who is this proposal for?</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Look up a company, then confirm or correct what came back — nothing flows
        into the proposal unverified.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          placeholder="Company name…"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup(name)}
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
        <button
          onClick={() => lookup(name)}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Looking up…" : "Look up"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SEEDED_COMPANY_NAMES.map((n) => (
          <button
            key={n}
            onClick={() => {
              setName(n);
              lookup(n);
            }}
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-ink-secondary hover:bg-accent-soft"
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Confirm / edit profile</h3>
            {draft.sourceNotes && (
              <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                {draft.sourceNotes.split("—")[0].trim()}
              </span>
            )}
          </div>

          <label className="block">
            <FieldLabel>Company name</FieldLabel>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <FieldLabel>Industry</FieldLabel>
              <input
                type="text"
                value={draft.industry ?? ""}
                onChange={(e) => patch({ industry: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
              />
            </label>
            <NumberField
              label="Employee count"
              value={draft.employeeCount ?? 0}
              step={100}
              onChange={(n) => patch({ employeeCount: n })}
            />
          </div>

          <label className="block">
            <FieldLabel>Revenue model</FieldLabel>
            <input
              type="text"
              value={draft.revenueModel ?? ""}
              onChange={(e) => patch({ revenueModel: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
            />
          </label>

          {draft.financialHighlights && draft.financialHighlights.length > 0 && (
            <div>
              <FieldLabel>Financial highlights (from enrichment)</FieldLabel>
              <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {draft.financialHighlights.map((h) => (
                  <div key={h.label} className="rounded bg-muted px-2 py-1.5">
                    <div className="text-[10px] text-ink-tertiary">{h.label}</div>
                    <div className="text-xs font-semibold">{h.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onConfirm(draft)}
            className="mt-2 w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Confirm profile & build proposal
          </button>
        </div>
      )}
    </div>
  );
}
