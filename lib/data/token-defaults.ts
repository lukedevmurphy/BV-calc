import type { Ranged } from "@/lib/types";
import { ranged } from "@/lib/economics/ranged";

// ─────────────────────────────────────────────────────────────────────────────
// Per-use-case token VOLUME assumptions — the heart of the cost-realism fix.
//
// DEFENSIBILITY OVER ACCURACY: there is no authoritative public benchmark for
// "tokens per DDQ / research task" — it depends entirely on implementation
// (docs ingested, caching, Haiku vs Opus, single-shot vs agentic multi-turn).
// These are ENGINEERING ESTIMATES, never sourced facts, and every one carries a
// one-line `basis`. The LOW column assumes aggressive caching + a lean single
// pass on a small model; the HIGH column assumes agentic multi-turn (the
// 400K–2M cumulative-input regime). The spread IS the message: cost depends on
// implementation strategy. Sourceable anchors used to shape these: a 10-K filing
// ≈ 100K–300K tokens; output is billed ~5× input across all current models.
//
// Everything here is a DEFAULT — the user overrides per use case in the UI and
// the override persists in the proposal payload (assumptions.tokenOverrides).
// ─────────────────────────────────────────────────────────────────────────────

export interface UseCaseTokens {
  input: Ranged; // tokens per task (low/base/high)
  output: Ranged;
  basis: string; // one-line estimate basis — shown in the UI + speaker notes
}

const tk = (
  li: number, bi: number, hi: number,
  lo: number, bo: number, ho: number,
  basis: string,
): UseCaseTokens => ({
  input: ranged(li * 1000, bi * 1000, hi * 1000),
  output: ranged(lo * 1000, bo * 1000, ho * 1000),
  basis,
});

/** Fallback for any use case without an explicit entry (mid-size doc task). */
export const FALLBACK_TOKENS: UseCaseTokens = tk(
  30, 80, 200, 5, 10, 20,
  "estimate — varies by implementation; mid-size document task",
);

/** Token defaults keyed by use-case id. All values are estimates, not sourced. */
export const USE_CASE_TOKENS: Record<string, UseCaseTokens> = {
  // ── from the brief's illustrative table ──
  "awm-portfolio-commentary": tk(8, 15, 30, 2, 4, 8, "one portfolio's data; short output"),
  "awm-research-synthesis": tk(40, 120, 400, 5, 12, 25, "1–3 research docs / filings; synthesis"),
  "awm-rfp-ddq": tk(100, 300, 800, 15, 30, 60, "several source docs (~100–300K ea); long response"),
  "awm-meeting-prep": tk(50, 150, 400, 8, 18, 40, "account history + market + holdings; multi-section"),
  "awm-kyc-onboarding": tk(30, 80, 200, 3, 8, 15, "ID / corporate docs; extraction output"),
  "awm-pitch-books": tk(80, 250, 700, 15, 35, 70, "multi-source, multi-slide; document-heavy"),
  // ── remaining catalog use cases (same spirit; all estimates) ──
  "awm-reg-monitoring": tk(30, 90, 250, 4, 10, 20, "rule texts + obligations register; gap analysis"),
  "awm-performance-qa": tk(15, 40, 100, 2, 5, 10, "performance + attribution data; short answer"),
  "awm-ips-onboarding": tk(30, 80, 200, 5, 12, 25, "policy templates + client docs; drafted IPS"),
  "awm-factsheets": tk(20, 50, 120, 3, 7, 15, "fund data + template; structured factsheet"),
  "bcm-credit-memos": tk(60, 180, 500, 10, 22, 45, "financials + filings + notes; credit memo"),
  "bcm-kyc-refresh": tk(30, 80, 200, 3, 8, 15, "periodic-review docs; screening narrative"),
  "bcm-earnings-notes": tk(40, 110, 300, 5, 12, 25, "transcript + filings; earnings note"),
  "bcm-deal-docs": tk(80, 250, 700, 8, 18, 40, "data-room docs; issue extraction"),
  "ib-pitch-agent": tk(80, 250, 700, 15, 35, 70, "comps + precedents + LBO; pitch deck"),
  "ib-model-builder": tk(40, 120, 350, 10, 25, 50, "financials; live model build"),
  "ib-meeting-prep": tk(50, 150, 400, 8, 18, 40, "briefing book; multi-section"),
  "er-market-researcher": tk(60, 180, 500, 8, 20, 40, "sector docs; landscape + peer comps"),
  "er-earnings-reviewer": tk(40, 110, 300, 5, 12, 25, "call + filings; model update + note"),
  "pe-ic-memo": tk(80, 220, 600, 12, 28, 55, "diligence docs; IC memo"),
  "pe-sourcing-screening": tk(20, 60, 180, 3, 8, 16, "inbound + thematic; screening shortlist"),
  "fa-valuation-reviewer": tk(40, 110, 300, 5, 12, 25, "GP packages; valuation review"),
  "fa-gl-reconciler": tk(20, 60, 160, 2, 6, 12, "ledgers; break tracing"),
  "fa-month-end-close": tk(30, 80, 220, 4, 10, 20, "accruals + roll-forwards; variance commentary"),
  "fa-statement-auditor": tk(25, 70, 180, 3, 7, 15, "LP statements; audit findings"),
  "ops-kyc-screener": tk(30, 80, 200, 3, 8, 15, "onboarding docs; rules-grid screening"),
};

/** Default token assumptions for a use-case id (override resolution happens in
 *  the engine, which prefers assumptions.tokenOverrides). */
export function tokenDefaultFor(useCaseId: string): UseCaseTokens {
  return USE_CASE_TOKENS[useCaseId] ?? FALLBACK_TOKENS;
}
