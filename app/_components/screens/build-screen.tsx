"use client";

import type { SectionConfigEntry, SectionOutput } from "@/lib/types";
import SectionList from "../section-list";
import { PageHeader, btnPrimary, btnSecondary } from "../ui";

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
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeader
        className="mb-6"
        kicker="Step 02 · Build"
        title="Compose the deck"
        lede={
          <>
            Toggle, reorder and review sections ·{" "}
            <span className="font-semibold text-ink">
              {enabled} of {sections.length} enabled
            </span>{" "}
            · all economics shown as conservative / base / optimistic ranges.
          </>
        }
        action={
          <div className="flex items-center gap-2">
            <button onClick={onBack} className={btnSecondary}>
              ← Back: Inputs
            </button>
            <button onClick={onNext} className={btnPrimary}>
              Next: Preview →
            </button>
          </div>
        }
      />

      <SectionList sections={sections} config={config} onConfigChange={onConfigChange} />

      <div className="mt-7 flex justify-end">
        <button onClick={onNext} className={btnPrimary}>
          Next: Preview →
        </button>
      </div>
    </div>
  );
}
