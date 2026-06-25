"use client";

import type {
  CompanyProfile,
  ScenarioAssumptions,
  UseCase,
  ValueModelInputs,
} from "@/lib/types";
import type { SubIndustry } from "@/lib/value-model/sub-industry";
import { isIllustrativeProfile } from "@/lib/provenance";
import UseCasePicker from "../use-case-picker";
import ValueModelPanel from "../value-model-panel";
import ItTakeoutEditor from "../it-takeout-editor";
import { DEFAULT_IT_TAKEOUT } from "@/lib/data/defaults";
import { NumberField, RangedField } from "../inputs";
import { PageHeader, Kicker, btnPrimary, btnSecondary } from "../ui";

interface Props {
  company: CompanyProfile;
  useCaseIds: string[];
  onUseCaseIds: (ids: string[]) => void;
  customUseCases: UseCase[];
  onCustomUseCases: (ucs: UseCase[]) => void;
  assumptions: ScenarioAssumptions;
  onAssumptions: (a: ScenarioAssumptions) => void;
  valueModel: ValueModelInputs;
  onValueModel: (v: ValueModelInputs) => void;
  subIndustry: SubIndustry;
  onOpenSettings: () => void;
  onNext: () => void;
}

export default function InputsScreen(props: Props) {
  const { company, assumptions, onAssumptions, onNext, onOpenSettings } = props;
  const approach = assumptions.valueApproach ?? "bottom_up";
  const patch = (value: Partial<ScenarioAssumptions>) => onAssumptions({ ...assumptions, ...value });
  const illustrative = isIllustrativeProfile(company);

  const setWeight = (id: string, weight: number) =>
    props.onValueModel({
      ...props.valueModel,
      topDownUseCaseWeights: { ...(props.valueModel.topDownUseCaseWeights ?? {}), [id]: weight },
    });

  const picker = (
    <UseCasePicker
      selectedIds={props.useCaseIds}
      onChange={props.onUseCaseIds}
      customUseCases={props.customUseCases}
      onCustomChange={props.onCustomUseCases}
      approach={approach}
      weights={props.valueModel.topDownUseCaseWeights}
      onWeight={setWeight}
      initialIndustry={props.subIndustry.useCaseIndustry}
      rankedIds={props.subIndustry.rankedUseCaseIds}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeader
        className="mb-6"
        kicker={`Step 01 · ${approach === "top_down" ? "Top-down method" : "Bottom-up method"}`}
        title={approach === "top_down" ? "Directional value inputs" : "Build from workflows"}
        lede={
          approach === "top_down"
            ? "A low-data SWAG from public financials — set the revenue-growth lift, then pick the use cases it breaks down across (by value tier)."
            : "Select the workflows and quantify the operating basis behind the business case."
        }
        action={
          <button onClick={onOpenSettings} className={btnSecondary}>
            Scenario settings
          </button>
        }
      />

      {approach === "top_down" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <ValueModelPanel
            valueModel={props.valueModel}
            subIndustry={props.subIndustry}
            onValueModelChange={props.onValueModel}
          />
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            {picker}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            {picker}
          </section>
          <div className="space-y-6">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <Kicker>Value basis</Kicker>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">These are case-defining inputs. Adoption, cost engineering, realization, and the forecast horizon live in Settings.</p>
              <div className="mt-4 space-y-4">
                <NumberField label="Target users in scope" value={assumptions.targetUserCount} step={50} min={1} onChange={(targetUserCount) => patch({ targetUserCount })} />
                <RangedField label="Loaded hourly cost" value={assumptions.loadedHourlyCost} step={5} prefix="$" onChange={(loadedHourlyCost) => patch({ loadedHourlyCost })} />
              </div>
            </section>
            <ScenarioSummary assumptions={assumptions} onEdit={onOpenSettings} />
          </div>
        </div>
      )}

      {/* IT cost takeout — universal value driver, available in both approaches. */}
      <div className="mt-6">
        <ItTakeoutEditor
          itTakeout={assumptions.itTakeout ?? DEFAULT_IT_TAKEOUT}
          horizonYears={assumptions.horizonYears}
          onChange={(itTakeout) => patch({ itTakeout })}
        />
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
        <p className="text-sm text-ink-secondary">
          <span className="font-semibold text-ink">{props.useCaseIds.length} use cases selected</span>
          {illustrative && <span> · illustrative company data—verify before presenting</span>}
        </p>
        <button onClick={onNext} className={btnPrimary}>Next: Build →</button>
      </div>
    </div>
  );
}

function ScenarioSummary({ assumptions, onEdit }: { assumptions: ScenarioAssumptions; onEdit: () => void }) {
  const year3 = assumptions.adoptionBreadth.find((point) => point.year === 3)?.base ?? 0;
  const overrides = Object.values(assumptions.annualCostOverrides ?? {}).filter((value) => value > 0).length;
  return (
    <section className="rounded-2xl border border-line bg-muted p-5">
      <Kicker>Scenario summary</Kicker>
      <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
        <SummaryStat label="Horizon" value={`${assumptions.horizonYears} years`} />
        <SummaryStat label="Year 3 adoption" value={`${Math.round(year3 * 100)}%`} />
        <SummaryStat label="Cost overrides" value={overrides ? `${overrides} set` : "Modeled"} />
      </div>
      <button onClick={onEdit} className="mt-4 text-sm font-semibold text-accent underline-offset-2 hover:underline">Edit scenario and cost assumptions →</button>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-canvas px-3 py-3.5"><div className="font-serif text-xl font-semibold text-accent">{value}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">{label}</div></div>;
}
