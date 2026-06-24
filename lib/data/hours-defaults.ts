// ─────────────────────────────────────────────────────────────────────────────
// Per-use-case SAVED-HOURS basis — the defensibility note behind each use case's
// hoursSavedPerInstance (which lives on the UseCase in use-cases.ts). Mirrors the
// token-defaults discipline from #6: every saved-hours figure carries a one-line
// basis so it survives a CFO asking "where did that come from", and is flagged as
// an ESTIMATE a practitioner should pressure-test — never a sourced fact.
//
// REVIEW NOTE (value-realism fix): the per-INSTANCE hours below are individually
// plausible (assembly/synthesis time a Claude workflow removes from one task).
// What was implausible in the old model was the AGGREGATE: the bottom-up sum
// credited EVERY adopter with EVERY selected use case at full volume (≈50+ saved
// hours/month/adopter). That is corrected structurally by the persona-coverage
// factor (assumptions.useCaseCoverage) — a typical adopter runs only a subset of
// the selected workflows — not by deflating these per-instance estimates.
// ─────────────────────────────────────────────────────────────────────────────

/** Saved-hours estimate basis, keyed by use-case id. All are estimates. */
export const SAVED_HOURS_BASIS: Record<string, string> = {
  // ── Asset & Wealth Management ──
  "awm-meeting-prep": "manual briefing-book assembly from CRM + holdings + market notes; review kept human",
  "awm-rfp-ddq": "first-draft of a multi-section DDQ from a prior-answer library; SME review retained",
  "awm-research-synthesis": "cross-source read + summarize an analyst still verifies before use",
  "awm-portfolio-commentary": "drafting + data assembly for one fund's commentary; PM edits the narrative",
  "awm-kyc-onboarding": "ID/corporate-doc extraction + checklist that was keyed by hand",
  "awm-reg-monitoring": "rule-text read + obligations gap-mapping a compliance officer signs off",
  "awm-pitch-books": "comps/collateral assembly into a branded deck; banker finalizes the story",
  "awm-performance-qa": "pulling performance + attribution to answer one client question",
  "awm-ips-onboarding": "IPS + onboarding paperwork drafted from templates + client docs",
  "awm-factsheets": "monthly factsheet data-merge + layout from fund data and a template",
  // ── Banking & Capital Markets ──
  "bcm-credit-memos": "memo first-draft from financials + filings + call notes; analyst owns the credit view",
  "bcm-kyc-refresh": "periodic-review doc read + screening narrative; investigator adjudicates",
  "bcm-earnings-notes": "transcript + filings summarized into an earnings note per name",
  "bcm-deal-docs": "data-room triage + issue extraction the deal team reviews",
  // ── Investment Banking ──
  "ib-pitch-agent": "comps + precedents + LBO assembled into a client-ready pitch; coverage edits",
  "ib-model-builder": "first-pass model build (DCF/LBO/3-statement) an analyst checks and tunes",
  "ib-meeting-prep": "briefing pack assembly before a client meeting",
  // ── Equity Research ──
  "er-market-researcher": "sector/theme landscape + peer comps scoped from scratch",
  "er-earnings-reviewer": "call + filings → model update + note draft the analyst signs",
  // ── Private Equity ──
  "pe-ic-memo": "IC-memo + diligence-checklist assembly from a data room; partner owns the call",
  "pe-sourcing-screening": "inbound/thematic triage into a screened shortlist",
  // ── Fund Administration ──
  "fa-valuation-reviewer": "GP-package valuation review + LP-reporting staging",
  "fa-gl-reconciler": "break tracing + root-cause across ledgers; ops signs off the fix",
  "fa-month-end-close": "accruals + roll-forwards + variance commentary in the close cycle",
  "fa-statement-auditor": "LP-statement pre-distribution audit checks",
  // ── Operations ──
  "ops-kyc-screener": "onboarding-doc parse + rules-grid screening; ops clears the exceptions",
};

/** Generic fallback basis for any use case without an explicit entry. */
export const FALLBACK_HOURS_BASIS =
  "estimate — manual assembly/synthesis time a Claude workflow removes; human review retained";

/** Saved-hours basis for a use-case id (estimate, always present). */
export function savedHoursBasisFor(useCaseId: string): string {
  return SAVED_HOURS_BASIS[useCaseId] ?? FALLBACK_HOURS_BASIS;
}
