import type { CompanyProfile } from "@/lib/types";

/**
 * Single source of truth for the illustrative / placeholder-financials flag.
 * The exact same string is rendered in the web preview, carried into the PPTX
 * export, and asserted by scripts/check-pptx.ts — so seed-company decks can
 * never present placeholder financials as sourced fact.
 */
export const ILLUSTRATIVE_FLAG =
  "Illustrative seed data — company figures are placeholders, not sourced; verify before presenting.";

/** True when a profile's provenance marks it as mocked / seed / illustrative. */
export function isIllustrativeProfile(company: CompanyProfile): boolean {
  const note = (company.sourceNotes ?? "").toLowerCase();
  return (
    note.includes("illustrative") ||
    note.includes("not sourced") ||
    note.includes("mock") ||
    note.includes("demo data") ||
    note.includes("placeholder")
  );
}

/** The flag string when illustrative, else null — convenient for spreads. */
export function illustrativeFlag(company: CompanyProfile): string | null {
  return isIllustrativeProfile(company) ? ILLUSTRATIVE_FLAG : null;
}

/**
 * Whether internal credibility warnings (⚠ implausible ratio, the illustrative
 * flag, the "goals are illustrative" caveat) should render. Draft mode shows
 * them; client mode suppresses them. Absent presentationMode → "draft", so a
 * warning is never silently hidden — suppression is always an explicit choice.
 */
export function showDraftWarnings(a: { presentationMode?: "draft" | "client" }): boolean {
  return (a.presentationMode ?? "draft") === "draft";
}
