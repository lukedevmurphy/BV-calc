"use client";

import { useDeferredValue, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type {
  CompanyProfile,
  ProposalPayload,
  ScenarioAssumptions,
  SectionConfigEntry,
  ValueModelInputs,
} from "@/lib/types";
import { DEFAULT_ASSUMPTIONS, DEFAULT_VALUE_MODEL } from "@/lib/data/defaults";
import { resolveUseCases } from "@/lib/data/use-cases";
import { resolveSubIndustry } from "@/lib/value-model/sub-industry";
import { getValuePrefillProvider } from "@/lib/value-model/prefill/provider";
import {
  computeAllSections,
  defaultSectionConfig,
  normalizeSectionConfig,
} from "@/lib/sections/index";
import { CURRENT_PROPOSAL_SCHEMA_VERSION } from "@/lib/proposals/migrate";
import SaveButton from "./save-button";
import CompanyStep from "./company-step";
import SavedCasesList from "./saved-cases-list";
import FlowNav, { type Screen } from "./flow-nav";

const InputsScreen = dynamic(() => import("./screens/inputs-screen"), {
  loading: ScreenLoading,
});
const BuildScreen = dynamic(() => import("./screens/build-screen"), {
  loading: ScreenLoading,
});
const PreviewScreen = dynamic(() => import("./screens/preview-screen"), {
  loading: ScreenLoading,
});
const SettingsScreen = dynamic(() => import("./screens/settings-screen"), {
  loading: ScreenLoading,
});

const DEFAULT_USE_CASE_IDS = [
  "awm-meeting-prep",
  "awm-rfp-ddq",
  "awm-research-synthesis",
  "awm-portfolio-commentary",
];

export interface BuilderInitialState {
  revision?: number;
  company: CompanyProfile;
  assumptions: ScenarioAssumptions;
  useCaseIds: string[];
  valueModel?: ValueModelInputs;
  sectionConfig: SectionConfigEntry[];
}

export default function Builder({
  initial,
  proposalId: initialProposalId,
}: {
  initial?: BuilderInitialState;
  proposalId?: string;
}) {
  const [company, setCompany] = useState<CompanyProfile | null>(initial?.company ?? null);
  const [editingCompany, setEditingCompany] = useState(false);
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(
    initial?.assumptions ?? DEFAULT_ASSUMPTIONS,
  );
  const [useCaseIds, setUseCaseIds] = useState<string[]>(
    initial?.useCaseIds ?? DEFAULT_USE_CASE_IDS,
  );
  const [valueModel, setValueModel] = useState<ValueModelInputs>(
    initial?.valueModel ?? DEFAULT_VALUE_MODEL,
  );
  const [sectionConfig, setSectionConfig] = useState<SectionConfigEntry[]>(
    normalizeSectionConfig(initial?.sectionConfig ?? defaultSectionConfig()),
  );
  const [proposalId, setProposalId] = useState<string | null>(initialProposalId ?? null);
  const [revision, setRevision] = useState(initial?.revision ?? 0);

  // Three-screen flow state — lives here, so moving Inputs ↔ Build ↔ Preview
  // (and the Settings page) never loses work.
  const [screen, setScreen] = useState<Screen>("inputs");
  const [returnScreen, setReturnScreen] = useState<Screen>("inputs");

  const deferredAssumptions = useDeferredValue(assumptions);
  const deferredValueModel = useDeferredValue(valueModel);
  const sectionsPending =
    deferredAssumptions !== assumptions || deferredValueModel !== valueModel;

  const sections = useMemo(
    () =>
      company
        ? computeAllSections({
            company,
            assumptions: deferredAssumptions,
            selectedUseCases: resolveUseCases(useCaseIds),
            valueModel: deferredValueModel,
            sectionConfig,
          })
        : [],
    [company, deferredAssumptions, deferredValueModel, useCaseIds, sectionConfig],
  );

  function confirmCompany(profile: CompanyProfile) {
    setCompany(profile);
    setEditingCompany(false);
    setScreen("inputs");
    // Reactive to sub-industry: seed the default use-case selection from the
    // company's sector, then prefill the value model with that set + priors.
    const sub = resolveSubIndustry(profile.industry);
    const ids = sub.rankedUseCaseIds;
    setUseCaseIds(ids);
    getValuePrefillProvider()
      .prefill({
        company: profile,
        approach: assumptions.valueApproach ?? "bottom_up",
        useCases: resolveUseCases(ids),
      })
      .then(setValueModel)
      .catch(() => setValueModel(DEFAULT_VALUE_MODEL));
  }

  if (!company || editingCompany) {
    return (
      <div className="px-6 py-12">
        <CompanyStep initial={company ?? undefined} onConfirm={confirmCompany} />
        {!company && <SavedCasesList />}
      </div>
    );
  }

  const confirmedCompany = company;
  const subIndustry = resolveSubIndustry(confirmedCompany.industry);

  // Saving is an explicit consistency boundary. Recompute from the immediate
  // inputs at click time rather than persisting useDeferredValue's prior frame.
  function createPayload(): ProposalPayload {
    const canonicalSections = computeAllSections({
      company: confirmedCompany,
      assumptions,
      selectedUseCases: resolveUseCases(useCaseIds),
      valueModel,
      sectionConfig,
    });
    return {
      schemaVersion: CURRENT_PROPOSAL_SCHEMA_VERSION,
      revision: revision + 1,
      company: confirmedCompany,
      assumptions,
      selectedUseCaseIds: useCaseIds,
      valueModel,
      sectionConfig: normalizeSectionConfig(sectionConfig),
      sections: canonicalSections,
    };
  }

  // Settings is reachable from any step; returning from it goes back to where
  // the user came from.
  function navigate(s: Screen) {
    if (s === "settings" && screen !== "settings") setReturnScreen(screen);
    setScreen(s);
  }

  return (
    <div className="min-h-screen pb-16">
      <FlowNav
        screen={screen}
        onNavigate={navigate}
        companyName={company.name}
        onEditCompany={() => setEditingCompany(true)}
        saveSlot={
          <SaveButton
            proposalId={proposalId}
            createPayload={createPayload}
            onSaved={(id, savedRevision) => {
              setProposalId(id);
              setRevision(savedRevision);
            }}
          />
        }
      />

      {screen === "inputs" && (
        <InputsScreen
          company={company}
          useCaseIds={useCaseIds}
          onUseCaseIds={setUseCaseIds}
          assumptions={assumptions}
          onAssumptions={setAssumptions}
          valueModel={valueModel}
          onValueModel={setValueModel}
          subIndustry={subIndustry}
          onNext={() => setScreen("build")}
        />
      )}

      {screen === "build" && (
        <BuildScreen
          sections={sections}
          config={sectionConfig}
          onConfigChange={setSectionConfig}
          onBack={() => setScreen("inputs")}
          onNext={() => setScreen("preview")}
        />
      )}

      {screen === "preview" && (
        <PreviewScreen
          sections={sections}
          companyName={company.name}
          sectionsPending={sectionsPending}
          onBack={() => setScreen("build")}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          assumptions={assumptions}
          onAssumptions={setAssumptions}
          valueModel={valueModel}
          onValueModel={setValueModel}
          sections={sections}
          onBack={() => setScreen(returnScreen)}
        />
      )}
    </div>
  );
}

function ScreenLoading() {
  return (
    <div className="mx-auto min-h-[320px] max-w-7xl px-6 py-6" aria-busy="true">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-5 h-64 animate-pulse rounded-xl border border-line bg-surface" />
    </div>
  );
}
