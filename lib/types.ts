// ─────────────────────────────────────────────────────────────────────────────
// Core domain types — the contract every layer imports.
// Everything here must stay plain JSON (no Dates, classes, functions):
// SectionOutput is the wire format three times over (web render, /api/pptx
// POST body, Neon jsonb column).
// ─────────────────────────────────────────────────────────────────────────────

/** Economic figures are never scalars — every monetary/quantity figure carries
 *  a low/base/high band. */
export interface Ranged {
  low: number;
  base: number;
  high: number;
  unit?: string;
}

/** One point on an adoption/usage ramp. Values are 0..1 fractions for
 *  adoptionBreadth, or relative multipliers for usageDepth. */
export interface RampPoint {
  year: number;
  low: number;
  base: number;
  high: number;
}

export interface ModelMixEntry {
  id: string;
  /** User-editable display name. Never referenced by logic. */
  label: string;
  inputPricePerMTok: number; // USD per 1M input tokens — user-editable
  outputPricePerMTok: number; // USD per 1M output tokens — user-editable
  sharePct: number; // 0..100, share of task volume routed to this model
  /** Access-restricted model (e.g. export-controlled): pricing is a labeled
   *  placeholder, never an invented number. Surfaced with priceNote. */
  restricted?: boolean;
  /** Caveat shown on the row when the price is a placeholder. */
  priceNote?: string;
}

/**
 * The shared scenario object — set once, read by every economic section.
 * Two-dimensional ramp: breadth (how many adopt) × depth (how heavily each
 * adopter consumes). Changing any field must re-flow Cost, Business Value,
 * and Forecast consistently.
 */
/**
 * Which altitude the value case is built at. Swaps the unit of analysis,
 * the input burden, and the confidence-band width — but NOT the output
 * schema: all three emit identical rangedFigures keys, so downstream
 * sections (cost, forecast, exec summary) stay agnostic.
 *   top_down  — whole company: derive value drivers from the top-line numbers
 *               via benchmark uplift. Few inputs, more assumptive, widest band.
 *   bottom_up — build each value driver up from use cases and sum them. Many
 *               inputs, more defensible, tightest band (today's path).
 */
export type ValueApproach = "top_down" | "bottom_up";

export interface ScenarioAssumptions {
  /** Value-case altitude. Absent on pre-feature saved payloads → treat as
   *  "bottom_up" (the original behavior). */
  valueApproach: ValueApproach;
  /** Total addressable users at the company/team. */
  targetUserCount: number;
  /** Dimension 1: fraction of target users active, ramped by year. */
  adoptionBreadth: RampPoint[];
  /** Dimension 2: consumption-intensity multiplier per adopter, by year. */
  usageDepth: RampPoint[];
  /** Cost lever — fraction of INPUT tokens served from prompt cache (~90% off
   *  cached input). 0..1; adjustable assumption. */
  cacheHitRatio: number;
  /** Cost lever — fraction of tasks run via the Batch API (~50% off). 0..1. */
  batchShare: number;
  /** Per-use-case token-volume OVERRIDES (keyed by use-case id). Absent → the
   *  catalog default (lib/data/token-defaults.ts). Persisted with the proposal
   *  so an overridden cost model round-trips through save/reload. */
  tokenOverrides?: Record<string, { input: Ranged; output: Ranged }>;
  modelMix: ModelMixEntry[];
  /** Fully loaded employee cost ($/hr) — drives bottom-up value. */
  loadedHourlyCost: Ranged;
  /** One-time enablement/services cost. Without a fixed component, value and
   *  cost are both linear in adoption and break-even degenerates to
   *  "month 1 or never" — this makes the break-even period meaningful. */
  implementationCost: Ranged;
  /** Default 3. */
  horizonYears: number;
  /** Reinvestment posture: share of freed value realized as CAPACITY (reinvest
   *  → revenue/production) vs OFFSET (cost-out → margin). 0..1; default 0.6
   *  (blend). Picks WHICH financial outcome value lands in AND — because the two
   *  modes realize at different rates (see offset/capacityRealization) — moves
   *  the TOTAL value too. Absent on pre-feature saved payloads → treat as 0.6. */
  reinvestmentCapacity?: number;
  /** Value-realization (OFFSET mode): the share of freed hours that actually
   *  converts to avoided cost. Saved time is only a dollar under cost-out to the
   *  extent headcount/hiring is genuinely avoided — fractional hours scattered
   *  across many people rarely all become FTE cuts. 0..1 band; editable estimate.
   *  Absent on pre-feature payloads → DEFAULT_VALUE_REALIZATION.offset. */
  offsetRealization?: Ranged;
  /** Value-realization (CAPACITY mode): the share of freed capacity actually
   *  monetized into output that earns. LOWER than offset — reinvested capacity is
   *  more speculative than direct cost-out. 0..1 band; editable estimate.
   *  Absent on pre-feature payloads → DEFAULT_VALUE_REALIZATION.capacity. */
  capacityRealization?: Ranged;
  /** Persona coverage: the share of the SELECTED workflows a typical adopter
   *  actually runs. The bottom-up sum credits every adopter with every selected
   *  use case at full volume, but the use cases map to distinct personas (a
   *  credit analyst is not also the KYC-ops clearer) — so a typical adopter runs
   *  only a subset. 0..1; editable. Corrects the "everyone does everything"
   *  overcount. Absent on pre-feature payloads → DEFAULT_USE_CASE_COVERAGE. */
  useCaseCoverage?: number;
}

// ── Value model (top_down inputs; bottom_up reuses use cases) ────────────────

/**
 * Inputs for the top_down value approach. Kept whole in state regardless of
 * the active approach so toggling the control never loses work; the section
 * reads these only for top_down. (bottom_up needs none of them — it reuses
 * selectedUseCases + ScenarioAssumptions.)
 */
export interface ValueModelInputs {
  // top_down group — whole-company benchmark math
  topline: Ranged;
  addressableShare: Ranged; // 0..1 share of topline addressable by AI
  upliftPct: Ranged; // 0..1 benchmark efficiency uplift
  /** Required (non-empty) for top_down; "uncited — user to verify" if no
   *  source — never a fabricated citation. */
  upliftSource?: string;
  realizationFactor: Ranged; // 0..1 discount on the theoretical uplift
}

// ── Company & enrichment ─────────────────────────────────────────────────────

export interface KeyValue {
  label: string;
  value: string;
}

export interface CompanyProfile {
  name: string;
  domain?: string;
  industry?: string;
  /** Analytics dimensions captured at proposal creation time. */
  headquarters?: string;
  region?: string;
  country?: string;
  employeeCount?: number;
  revenueModel?: string;
  /** e.g. from a 10-K — mocked for now. */
  financialHighlights?: KeyValue[];
  /** Provenance, even when mocked. */
  sourceNotes?: string;
}

export interface EnrichmentProvider {
  enrich(companyName: string): Promise<CompanyProfile>;
}

// ── Use cases ────────────────────────────────────────────────────────────────

export type UseCaseTag =
  // where AI helps
  | "automation"
  | "augmentation"
  | "agency"
  // the 4 D's competency lens
  | "delegation"
  | "description"
  | "discernment"
  | "diligence";

export interface UseCase {
  id: string;
  label: string;
  industry: string;
  personaHint?: string;
  /** Default sizing knobs the value/cost sections consume. */
  hoursSavedPerInstance?: Ranged;
  instancesPerMonthPerUser?: Ranged;
  tags?: UseCaseTag[];
  /** Where this use case / agent template comes from, for "more info" links
   *  (e.g. the Anthropic financial-services agent catalog). */
  source?: { label: string; url: string };
}

// ── SectionOutput — the keystone object every module returns ────────────────

export type SectionKind =
  | "executive_summary"
  | "problem"
  | "current_state"
  | "future_state"
  | "product"
  | "use_case_persona"
  | "business_value"
  | "proposal"
  | "cost"
  | "forecast"
  | "roadmap"
  | "next_steps"
  // Social proof: a real, attributed Anthropic customer story matched to the
  // company's sub-industry, with a separately-labeled target analogy.
  | "peer_proof"
  // Auto-generated scenario appendix slides (not user-configurable; produced by
  // lib/sections/scenario.ts for Preview + export, never by computeAllSections).
  | "scenario_conservative"
  | "scenario_upside";

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

export interface ChartPoint {
  x: number | string;
  y: number;
}

export interface ChartSeries {
  name: string;
  points: ChartPoint[];
  /** Hint for axis/tooltip formatting in both renderers. */
  format?: "currency" | "number" | "percent";
}

export interface BandedPoint {
  x: number | string;
  low: number;
  base: number;
  high: number;
}

/** For ranged forecasts — rendered as a funnel (narrow near-term, widening). */
export interface BandedSeries {
  name: string;
  points: BandedPoint[];
  format?: "currency" | "number" | "percent";
}

export interface SectionOutput {
  id: string;
  kind: SectionKind;
  title: string;
  subtitle?: string;
  /** Short, slide-ready phrases — NOT paragraphs. */
  bullets?: string[];
  /** Optional 1–3 sentence framing, used sparingly. */
  narrative?: string;
  /** Callout numbers. */
  stats?: KeyValue[];
  table?: TableData;
  charts?: ChartSeries[];
  bandedCharts?: BandedSeries[];
  /** Goes into pptx notes; hidden in web preview by default. */
  speakerNotes?: string;
  /** Named economic outputs other sections can reference. */
  rangedFigures?: Record<string, Ranged>;
  /** Clickable source links (e.g. an Anthropic customer-story URL). Rendered as
   *  "label ↗" in the web SlideView; the URL is also carried in a bullet so it
   *  survives into the pptx export as text. */
  links?: { label: string; url: string }[];
  /** Human-readable list of which assumptions fed this section — auditability. */
  assumptionsUsed?: string[];
  order: number;
  enabled: boolean;
  /** Appendix placement (stamped from sectionConfig): true → renders after the
   *  main deck, behind the appendix divider, in both Preview and pptx. */
  appendix?: boolean;
  /** Corner "nugget" label naming the scenario shown — "Base case" on the main
   *  deck, "Conservative case" / "Upside case" on the auto-generated scenario
   *  appendix slides. Exec summary (full range) carries none. */
  scenarioTag?: string;
}

// ── Module contract ──────────────────────────────────────────────────────────

export interface ProposalContext {
  company: CompanyProfile;
  assumptions: ScenarioAssumptions;
  selectedUseCases: UseCase[];
  /** Inputs for the top_down value approach. Always present
   *  (computeAllSections fills a default); bottom_up ignores it. */
  valueModel: ValueModelInputs;
  /** For sections that summarize others (exec summary runs last). */
  priorSections: Partial<Record<SectionKind, SectionOutput>>;
}

/** v1 modules are all synchronous & pure so they can run in the browser for
 *  live reflow; the Promise arm exists so a future async (AI-backed) module
 *  slots in without an interface change. */
export type SectionModule = (
  ctx: ProposalContext,
) => SectionOutput | Promise<SectionOutput>;

// ── Persistence shape (one jsonb column in Neon) ─────────────────────────────

export interface SectionConfigEntry {
  kind: SectionKind;
  order: number;
  enabled: boolean;
  /** True → this section sits in the appendix lane (after the appendix divider
   *  on the Build screen, and after the main deck in Preview / export). */
  appendix?: boolean;
}

export interface ProposalPayload {
  /** Wire-format version. Increment when persisted proposal semantics change. */
  schemaVersion: number;
  /** Monotonic saved-state revision, incremented after every successful save. */
  revision: number;
  company: CompanyProfile;
  assumptions: ScenarioAssumptions;
  selectedUseCaseIds: string[];
  /** Inputs for the top_down value approach. Optional so pre-feature saved
   *  payloads still rehydrate (builder falls back to default). */
  valueModel?: ValueModelInputs;
  sectionConfig: SectionConfigEntry[];
  /** Last computed snapshot — fast load/share; recomputed live after edit. */
  sections: SectionOutput[];
}
