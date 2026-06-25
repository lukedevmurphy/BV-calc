// Server-only deck orchestration: SectionOutput[] → a populated PptxGenJS deck.
// Shared by the export route (app/api/pptx/route.ts) and the verification
// (scripts/check-pptx.ts) so both exercise the SAME slide-fit + ordering logic.
//
// Flow: cover → main-flow slides (deck order) → appendix divider → appendix
// (dragged appendix sections, then summarized-overflow from main sections, then
// the auto-generated conservative / upside scenario slides). Every section is
// run through the slide-fit engine first, which may compact it, split it, or
// peel a summarized table off to the appendix.

import PptxGenJS from "pptxgenjs";
import type { SectionOutput } from "@/lib/types";
import { scenarioAppendixSlides } from "@/lib/sections/scenario";
import { planSection } from "@/lib/slide-fit/plan";
import {
  addAppendixDivider,
  addSectionSlide,
  addTitleSlide,
  defineBrandMaster,
} from "./slide-builders";

/** Build the deck and serialize it to a Buffer — the shared step both export
 *  routes (/api/pptx download, /api/slides Drive upload) use, so the seam stays
 *  single-sourced. nodebuffer, never writeFile (Vercel's FS is read-only). */
export async function deckBuffer(
  companyName: string,
  sections: SectionOutput[],
  presentationMode: "draft" | "client" = "draft",
): Promise<Buffer> {
  const pptx = buildDeck(companyName, sections, presentationMode);
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

export function buildDeck(
  companyName: string,
  sections: SectionOutput[],
  presentationMode: "draft" | "client" = "draft",
): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.title = `Business Value Proposal — ${companyName}`;
  defineBrandMaster(pptx, presentationMode);

  const enabled = sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const main = enabled.filter((s) => !s.appendix);
  const draggedAppendix = enabled.filter((s) => s.appendix);
  const scenarios = scenarioAppendixSlides(enabled, inferFinalYear(enabled));

  // Slide-fit each section; main-flow keeps deck order, summarized overflow and
  // scenario slides land in the appendix lane.
  const plannedMain = main.flatMap(planSection);
  const plannedDragged = draggedAppendix.flatMap(planSection);
  const plannedScenarios = scenarios.flatMap(planSection);

  const mainFlow = plannedMain.filter((p) => p.placement === "main");
  const appendixFlow = [
    ...plannedDragged,
    ...plannedMain.filter((p) => p.placement === "appendix"),
    ...plannedScenarios,
  ];

  addTitleSlide(pptx, companyName);

  let pageNo = 1;
  for (const p of mainFlow) {
    addSectionSlide(pptx, p.section, { pageNo: pageNo++, fontScale: p.fontScale });
  }

  if (appendixFlow.length > 0) {
    addAppendixDivider(
      pptx,
      appendixFlow.map((p) => p.section.title),
      presentationMode,
    );
    appendixFlow.forEach((p, i) => {
      addSectionSlide(pptx, p.section, {
        pageNo: pageNo++,
        appendixIndex: i + 1,
        fontScale: p.fontScale,
      });
    });
  }

  return pptx;
}

/** Horizon year from "Year N" / "YN" stat labels, so scenario slides label
 *  their figures consistently. Defaults to 3. */
function inferFinalYear(sections: SectionOutput[]): number {
  let max = 0;
  for (const s of sections) {
    for (const st of s.stats ?? []) {
      const m = st.label.match(/Y(?:ear)?\s*(\d+)/i);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return max || 3;
}
