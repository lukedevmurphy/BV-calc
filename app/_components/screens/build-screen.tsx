"use client";

import type { SectionConfigEntry, SectionOutput } from "@/lib/types";
import SectionList from "../section-list";

interface Props {
  sections: SectionOutput[];
  config: SectionConfigEntry[];
  onConfigChange: (config: SectionConfigEntry[]) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Build screen — the 12-section editor. Section nav/list on the LEFT, the
 *  section work/edit area on the RIGHT (see SectionList). */
export default function BuildScreen({
  sections,
  config,
  onConfigChange,
  onBack,
  onNext,
}: Props) {
  const enabled = sections.filter((s) => s.enabled).length;
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Build</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Toggle, reorder and review sections · {enabled} of {sections.length} enabled · all
            economics shown as conservative / base / optimistic ranges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            ← Back: Inputs
          </button>
          <button
            onClick={onNext}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Next: Preview →
          </button>
        </div>
      </div>

      <SectionList sections={sections} config={config} onConfigChange={onConfigChange} />

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Next: Preview →
        </button>
      </div>
    </div>
  );
}
