import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { proposals } from "@/db/schema";
import type { ProposalPayload } from "@/lib/types";
import { dbError } from "./helpers";

export const runtime = "nodejs";

/** GET /api/proposals — list (id, companyName, timestamps) for the picker. */
export async function GET(): Promise<Response> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: proposals.id,
        companyName: proposals.companyName,
        createdAt: proposals.createdAt,
        updatedAt: proposals.updatedAt,
      })
      .from(proposals)
      .orderBy(desc(proposals.updatedAt));
    return Response.json(rows);
  } catch (e) {
    return dbError(e);
  }
}

/** POST /api/proposals — create; body is a ProposalPayload. */
export async function POST(req: Request): Promise<Response> {
  let payload: ProposalPayload;
  try {
    payload = (await req.json()) as ProposalPayload;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!payload?.company?.name || !Array.isArray(payload.sections)) {
    return Response.json({ error: "invalid ProposalPayload" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(proposals)
      .values({ companyName: payload.company.name, payload })
      .returning({ id: proposals.id });
    return Response.json({ id: row.id }, { status: 201 });
  } catch (e) {
    return dbError(e);
  }
}
