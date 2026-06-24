import type {
  KeyValue,
  ProposalContext,
  Ranged,
  SectionOutput,
  TableData,
} from "@/lib/types";
import { itTakeoutValueAtYear } from "@/lib/economics/it-takeout";
import { fmtCurrency, fmtPercent, fmtRange } from "@/lib/format";

/**
 * "Show your work" appendix slide for the IT cost takeout / legacy application
 * rationalization driver. Lays out the sunset schedule year by year: cumulative
 * legacy run-rate eliminated and the realization-adjusted takeout that folds
 * into the Business Value headline. Opt-in — omits itself when disabled or empty.
 */
export function itTakeoutSection(ctx: ProposalContext): SectionOutput | null {
  const { assumptions: a } = ctx;
  const t = a.itTakeout;
  if (!t || !t.enabled) return null;

  const finalYear = a.horizonYears;
  const final = itTakeoutValueAtYear(t, finalYear);
  if (final.takeout.base <= 1) return null; // enabled but no schedule entered yet

  const years = Array.from({ length: finalYear }, (_, i) => i + 1);
  const rzPct = Math.round(t.realization.base * 100);

  const table: TableData = {
    columns: ["Year", "Cumulative IT cost eliminated", "Realized takeout"],
    rows: years.map((y) => {
      const r = itTakeoutValueAtYear(t, y);
      return [`Year ${y}`, fmtCurrency(r.gross), fmtCurrency(r.takeout.base)];
    }),
  };

  const stats: KeyValue[] = [
    { label: `Legacy cost eliminated (Y${finalYear})`, value: fmtCurrency(final.gross) },
    { label: "Realization", value: fmtPercent(t.realization.base) },
    { label: `Realized takeout (Y${finalYear})`, value: fmtRange(final.takeout) },
  ];

  const rangedFigures: Record<string, Ranged> = {
    itTakeoutFinalYear: final.takeout,
    itTakeoutY1: itTakeoutValueAtYear(t, 1).takeout,
  };

  return {
    id: "it_takeout",
    kind: "it_takeout",
    title: "IT Cost Takeout",
    subtitle: `Legacy application rationalization — ${fmtCurrency(final.gross)} run-rate retired by Year ${finalYear}`,
    narrative:
      "Decommissioning legacy applications and infrastructure eliminates recurring run-rate cost on a sunset schedule. The takeout is a hard-dollar saving, realization-adjusted for execution risk.",
    bullets: [
      `Cumulative annual legacy IT cost eliminated by Year ${finalYear}: ${fmtCurrency(final.gross)} (run-rate)`,
      `Realized takeout = planned × ${rzPct}% realization — execution risk on migration, contract exits, and stranded dependencies`,
      "A hard-dollar cost-out → operating margin; folds into the benefit and ROI",
    ],
    stats,
    table,
    rangedFigures,
    speakerNotes:
      `IT cost takeout is legacy application rationalization: each year, more legacy apps and infrastructure are sunset, ` +
      `eliminating their recurring run-rate cost. The schedule is cumulative — a sunset, once done, stays done. The realized ` +
      `figure haircuts the plan by ${rzPct}% for execution risk. Unlike the soft productivity drivers this is a hard-dollar ` +
      `saving, so it routes straight to operating margin and supports the ROI.`,
    assumptionsUsed: [
      "itTakeout.enabled",
      "itTakeout.sunsetByYear (cumulative annual run-rate eliminated)",
      "itTakeout.realization (execution-risk haircut)",
      `horizonYears (${finalYear})`,
    ],
    order: 0,
    enabled: true,
  };
}
