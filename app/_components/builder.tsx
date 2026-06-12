"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type {
  CompanyProfile,
  ProposalPayload,
  ScenarioAssumptions,
  SectionConfigEntry,
} from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/data/defaults";
import { resolveUseCases } from "@/lib/data/use-cases";
import { computeAllSections, defaultSectionConfig } from "@/lib/sections/index";
import ExportButton from "./export-button";
import SaveButton from "./save-button";
import AssumptionsPanel from "./assumptions-panel";
import CompanyStep from "./company-step";
import UseCasePicker from "./use-case-picker";
import SectionList from "./section-list";

const DEFAULT_USE_CASE_IDS = [
  "awm-meeting-prep",
  "awm-rfp-ddq",
  "awm-research-synthesis",
  "awm-portfolio-commentary",
];

export interface BuilderInitialState {
  company: CompanyProfile;
  assumptions: ScenarioAssumptions;
  useCaseIds: string[];
  sectionConfig: SectionConfigEntry[];
}

export default function Builder({
  initial,
  proposalId: initialProposalId,
}: {
  initial?: BuilderInitialState;
  proposalId?: string;
}) {
  const [company, setCompany] = useState<CompanyProfile | null>(
    initial?.company ?? null,
  );
  const [editingCompany, setEditingCompany] = useState(false);
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(
    initial?.assumptions ?? DEFAULT_ASSUMPTIONS,
  );
  const [useCaseIds, setUseCaseIds] = useState<string[]>(
    initial?.useCaseIds ?? DEFAULT_USE_CASE_IDS,
  );
  const [sectionConfig, setSectionConfig] = useState<SectionConfigEntry[]>(
    initial?.sectionConfig ?? defaultSectionConfig(),
  );
  const [proposalId, setProposalId] = useState<string | null>(
    initialProposalId ?? null,
  );

  // Keep slider drags at full frame rate: inputs update immediately, the
  // full-pipeline recompute trails via deferred value.
  const deferredAssumptions = useDeferredValue(assumptions);

  const sections = useMemo(
    () =>
      company
        ? computeAllSections({
            company,
            assumptions: deferredAssumptions,
            selectedUseCases: resolveUseCases(useCaseIds),
            sectionConfig,
          })
        : [],
    [company, deferredAssumptions, useCaseIds, sectionConfig],
  );

  if (!company || editingCompany) {
    return (
      <div className="px-6 py-12">
        <CompanyStep
          initial={company ?? undefined}
          onConfirm={(profile) => {
            setCompany(profile);
            setEditingCompany(false);
          }}
        />
      </div>
    );
  }

  // Export and save both read the same settled `sections` memo the preview
  // renders — never a mid-drag frame.
  const payload: ProposalPayload = {
    company,
    assumptions: deferredAssumptions,
    selectedUseCaseIds: useCaseIds,
    sectionConfig,
    sections,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Business Value Proposal — {company.name}
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {sections.filter((s) => s.enabled).length} of {sections.length} sections
            enabled · all economics shown as conservative / base / optimistic ranges ·{" "}
            <button
              onClick={() => setEditingCompany(true)}
              className="text-accent underline-offset-2 hover:underline"
            >
              edit company profile
            </button>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveButton proposalId={proposalId} payload={payload} onSaved={setProposalId} />
          <ExportButton companyName={company.name} sections={sections} />
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:h-fit lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="space-y-6">
            <UseCasePicker selectedIds={useCaseIds} onChange={setUseCaseIds} />
            <hr className="border-line" />
            <AssumptionsPanel assumptions={assumptions} onChange={setAssumptions} />
          </div>
        </aside>

        <main className="pl-6">
          <SectionList
            sections={sections}
            config={sectionConfig}
            onConfigChange={setSectionConfig}
          />
        </main>
      </div>
    </div>
  );
}
