import PptxGenJS from "pptxgenjs";
import type { SectionOutput } from "@/lib/types";
import { scenarioAppendixSlides } from "@/lib/sections/scenario";
import {
  addAppendixDivider,
  addSectionSlide,
  addTitleSlide,
  defineBrandMaster,
} from "@/lib/pptx/slide-builders";

// PptxGenJS needs Node APIs; never run this on the Edge runtime.
export const runtime = "nodejs";

interface ExportRequest {
  companyName: string;
  sections: SectionOutput[];
}

export async function POST(req: Request): Promise<Response> {
  let body: ExportRequest;
  try {
    body = (await req.json()) as ExportRequest;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.sections) || typeof body.companyName !== "string") {
    return Response.json(
      { error: "expected { companyName, sections: SectionOutput[] }" },
      { status: 400 },
    );
  }

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.title = `Business Value Proposal — ${body.companyName}`;
  defineBrandMaster(pptx);

  const sections = body.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Appendix lane = sections the user dragged below the appendix divider
  // (s.appendix), in order, PLUS the auto-generated conservative / upside
  // scenario slides that carry the low / high figures. Main deck shows the base
  // case only; the divider appears whenever the appendix is non-empty.
  const main = sections.filter((s) => !s.appendix);
  const draggedAppendix = sections.filter((s) => s.appendix);
  const finalYear = inferFinalYear(sections);
  const scenarios = scenarioAppendixSlides(sections, finalYear);
  const appendix: SectionOutput[] = [...draggedAppendix, ...scenarios];

  addTitleSlide(pptx, body.companyName, sections.length);

  main.forEach((section, i) => {
    addSectionSlide(pptx, section, { pageNo: i + 1 });
  });

  if (appendix.length > 0) {
    addAppendixDivider(
      pptx,
      appendix.map((s) => s.title),
    );
    appendix.forEach((section, i) => {
      addSectionSlide(pptx, section, {
        pageNo: main.length + i + 1,
        appendixIndex: i + 1,
      });
    });
  }

  // nodebuffer (never writeFile — Vercel's filesystem is read-only).
  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const filename = `proposal-${slugify(body.companyName)}.pptx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proposal";
}

/** Horizon year, read from the "Year N" / "YN" stat labels the sections emit
 *  (so the scenario slides label their figures consistently). Defaults to 3. */
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
