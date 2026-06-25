import type { SectionOutput } from "@/lib/types";
import { auth } from "@/auth";
import { deckBuffer } from "@/lib/pptx/build-deck";

// Builds the .pptx (Node-only, PptxGenJS) then uploads to Google Drive.
export const runtime = "nodejs";

interface ExportRequest {
  companyName: string;
  sections: SectionOutput[];
  presentationMode?: "draft" | "client";
}

const RECONNECT = Response.json({ error: "reconnect-google" }, { status: 401 });

/**
 * POST /api/slides — generate the deck and upload it to the signed-in user's
 * Google Drive as a NATIVE Google Slides file (Drive converts the .pptx on
 * import via the google-apps.presentation target mimeType). Returns the Slides
 * URL. Reuses the exact deck the .pptx export produces (deckBuffer).
 */
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

  // The user's own Google access token (with the drive.file scope). Missing or
  // un-refreshable → ask the client to reconnect (re-consent).
  const session = await auth();
  const accessToken = session?.accessToken;
  if (!accessToken || session?.error) return RECONNECT;

  const mode = body.presentationMode === "client" ? "client" : "draft";
  const buffer = await deckBuffer(body.companyName, body.sections, mode);

  // multipart/related: JSON metadata + the .pptx bytes; the target mimeType
  // tells Drive to convert the upload into a native Google Slides deck.
  const boundary = `bvcalc_${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: `${body.companyName} — Business Value`,
    mimeType: "application/vnd.google-apps.presentation",
  };
  const pre = Buffer.from(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n",
    "utf8",
  );
  const post = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const multipart = Buffer.concat([pre, buffer, post]);

  const driveRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(multipart),
    },
  );

  if (driveRes.status === 401 || driveRes.status === 403) return RECONNECT;
  if (!driveRes.ok) {
    return Response.json(
      { error: `Drive upload failed (${driveRes.status})` },
      { status: 502 },
    );
  }

  const file = (await driveRes.json()) as { id?: string; webViewLink?: string };
  const url = file.webViewLink ?? (file.id ? `https://docs.google.com/presentation/d/${file.id}/edit` : null);
  if (!url) return Response.json({ error: "no file URL returned" }, { status: 502 });
  return Response.json({ url });
}
