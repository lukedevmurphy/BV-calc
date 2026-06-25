import type { SectionOutput } from "@/lib/types";
import { deckBuffer } from "@/lib/pptx/build-deck";

// PptxGenJS needs Node APIs; never run this on the Edge runtime.
export const runtime = "nodejs";

interface ExportRequest {
  companyName: string;
  sections: SectionOutput[];
  /** Deck chrome: footer text only. Section content (warnings) is already gated
   *  in the SectionOutput before export. Absent → "draft". */
  presentationMode?: "draft" | "client";
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

  // Shared orchestration (slide-fit + ordering) — same code path the
  // verification (scripts/check-pptx.ts) and the Slides export exercise.
  const mode = body.presentationMode === "client" ? "client" : "draft";
  const buffer = await deckBuffer(body.companyName, body.sections, mode);
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
