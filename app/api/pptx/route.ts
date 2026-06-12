import PptxGenJS from "pptxgenjs";
import type { SectionKind, SectionOutput } from "@/lib/types";
import { APPENDIX_KINDS } from "@/lib/sections/index";
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

  // Appendix = the trailing run of appendix-kind sections (scenario detail,
  // consumption economics). If the user reorders them into the main flow,
  // they render as ordinary slides and no divider appears.
  let appendixStart = sections.length;
  while (
    appendixStart > 0 &&
    APPENDIX_KINDS.has(sections[appendixStart - 1].kind as SectionKind)
  ) {
    appendixStart--;
  }
  const main = sections.slice(0, appendixStart);
  const appendix = sections.slice(appendixStart);

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
