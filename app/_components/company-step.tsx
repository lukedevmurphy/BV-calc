"use client";

import { useState } from "react";
import type { CompanyProfile, ValueApproach } from "@/lib/types";
import { SEEDED_COMPANY_NAMES } from "@/lib/enrichment/mock";
import { FieldLabel, NumberField } from "./inputs";
import { PageHeader, Panel, Kicker, btnPrimary } from "./ui";

interface Props {
  onConfirm: (profile: CompanyProfile, approach: ValueApproach) => void;
  initial?: CompanyProfile;
  initialApproach?: ValueApproach;
}

/** Consistent editorial input on a cream card. */
const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink shadow-[inset_0_1px_1px_rgba(43,38,24,0.03)] transition placeholder:text-ink-tertiary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

/**
 * Company lookup → ALWAYS an editable confirm step. Verifying the lookup is
 * a feature, not a stopgap: the practitioner exercises discernment before
 * the AI's (currently mocked) research feeds the proposal.
 */
export default function CompanyStep({ onConfirm, initial, initialApproach }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [draft, setDraft] = useState<CompanyProfile | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approach, setApproach] = useState<ValueApproach | null>(initialApproach ?? null);

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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Step 01 · Company"
        title="Who is this proposal for?"
        lede="Look up a company, then confirm or correct what came back — nothing flows into the proposal unverified."
      />

      <Panel className="mt-7">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            placeholder="Company name…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup(name)}
            className="flex-1 rounded-lg border border-line-strong bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          <button
            onClick={() => lookup(name)}
            disabled={busy || !name.trim()}
            className={btnPrimary}
          >
            {busy ? "Looking up…" : "Look up"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
            Try
          </span>
          {SEEDED_COMPANY_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => {
                setName(n);
                lookup(n);
              }}
              className="rounded-full border border-line-strong bg-canvas px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              {n}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      </Panel>

      {draft && (
        <Panel className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <Kicker>Confirm / edit profile</Kicker>
            {draft.sourceNotes && (
              <span className="rounded-full border border-line bg-accent-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                {draft.sourceNotes.split("—")[0].trim()}
              </span>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <FieldLabel>Company name</FieldLabel>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={inputCls}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>Industry</FieldLabel>
                <input
                  type="text"
                  value={draft.industry ?? ""}
                  onChange={(e) => patch({ industry: e.target.value })}
                  className={inputCls}
                />
              </label>
              <NumberField
                label="Employee count"
                value={draft.employeeCount ?? 0}
                step={100}
                onChange={(n) => patch({ employeeCount: n })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <FieldLabel>Headquarters</FieldLabel>
                <input
                  type="text"
                  value={draft.headquarters ?? ""}
                  placeholder="New York, NY"
                  onChange={(e) => patch({ headquarters: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <FieldLabel>Region</FieldLabel>
                <input
                  type="text"
                  value={draft.region ?? ""}
                  placeholder="Northeast"
                  onChange={(e) => patch({ region: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <FieldLabel>Country</FieldLabel>
                <input
                  type="text"
                  value={draft.country ?? ""}
                  placeholder="United States"
                  onChange={(e) => patch({ country: e.target.value })}
                  className={inputCls}
                />
              </label>
            </div>

            <label className="block">
              <FieldLabel>Revenue model</FieldLabel>
              <input
                type="text"
                value={draft.revenueModel ?? ""}
                onChange={(e) => patch({ revenueModel: e.target.value })}
                className={inputCls}
              />
            </label>

            {/* Coding-driver inputs — seed the coding-efficiency value driver. */}
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Engineering headcount"
                value={draft.engineeringHeadcount ?? 0}
                step={10}
                onChange={(n) => patch({ engineeringHeadcount: Math.max(0, Math.round(n)) })}
              />
              <label className="block">
                <FieldLabel help="Baseline annual revenue growth — feeds the coding driver's revenue path (stepped up by reinvested capacity). Placeholder; confirm before presenting.">
                  Revenue growth (%)
                </FieldLabel>
                <input
                  type="number"
                  value={
                    draft.revenueGrowthRate !== undefined
                      ? Number((draft.revenueGrowthRate * 100).toFixed(2))
                      : ""
                  }
                  step={1}
                  min={0}
                  placeholder="10"
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    patch({ revenueGrowthRate: Number.isFinite(n) ? n / 100 : undefined });
                  }}
                  className={inputCls}
                />
              </label>
            </div>

            {draft.financialHighlights && draft.financialHighlights.length > 0 && (
              <div>
                <FieldLabel>Financial highlights (from enrichment)</FieldLabel>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {draft.financialHighlights.map((h) => (
                    <div
                      key={h.label}
                      className="rounded-lg border border-line bg-canvas px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-ink-tertiary">
                        {h.label}
                      </div>
                      <div className="mt-0.5 font-serif text-sm font-semibold text-ink">
                        {h.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <fieldset className="mt-7 border-t border-line pt-6">
            <legend className="sr-only">How should we size the value?</legend>
            <Kicker>Sizing method</Kicker>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-secondary">
              This choice changes the inputs, economics, and full proposal story. You can
              return here to switch methods without losing your draft.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MethodCard
                active={approach === "top_down"}
                title="Top-down directional value"
                badge="Fast · directional"
                description="Start with company financials, select functional value pools, and produce a CFO-level SWAG with a wider confidence band. No use cases."
                onClick={() => setApproach("top_down")}
              />
              <MethodCard
                active={approach === "bottom_up"}
                title="Bottom-up business case"
                badge="Detailed · defensible"
                description="Select workflows and build value from hours, volume, adoption, and consumption cost. Best for pilots and budget approval."
                onClick={() => setApproach("bottom_up")}
              />
            </div>
          </fieldset>

          <button
            onClick={() => approach && onConfirm(draft, approach)}
            disabled={!approach}
            className={`${btnPrimary} mt-6 w-full py-3`}
          >
            {approach
              ? `Continue with ${approach === "top_down" ? "top-down" : "bottom-up"} →`
              : "Choose a sizing method"}
          </button>
        </Panel>
      )}
    </div>
  );
}

function MethodCard({
  active,
  title,
  badge,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  badge: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-40 rounded-xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
        active
          ? "border-accent bg-accent-soft shadow-card"
          : "border-line-strong bg-canvas hover:border-accent hover:bg-accent-soft/40"
      }`}
    >
      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
        <span className="h-0.5 w-4 rounded-full bg-accent-bright" />
        {badge}
      </span>
      <span className="mt-2.5 block font-serif text-lg font-semibold text-ink">{title}</span>
      <span className="mt-2 block text-sm leading-relaxed text-ink-secondary">
        {description}
      </span>
    </button>
  );
}
