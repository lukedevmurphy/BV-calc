import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { proposals } from "@/db/schema";
import type { ProposalPayload } from "@/lib/types";
import { migrateProposalPayload } from "@/lib/proposals/migrate";
import { dbError } from "../helpers";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  try {
    const db = getDb();
    const [row] = await db.select().from(proposals).where(eq(proposals.id, id));
    if (!row) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ ...row, payload: migrateProposalPayload(row.payload) });
  } catch (e) {
    return dbError(e);
  }
}

export async function PUT(req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  let payload: ProposalPayload;
  try {
    payload = migrateProposalPayload(await req.json());
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  try {
    const db = getDb();
    const [row] = await db
      .update(proposals)
      .set({
        companyName: payload.company.name,
        payload,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, id))
      .returning({ id: proposals.id });
    if (!row) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ id: row.id });
  } catch (e) {
    return dbError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  try {
    const db = getDb();
    const [row] = await db
      .delete(proposals)
      .where(eq(proposals.id, id))
      .returning({ id: proposals.id });
    if (!row) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
