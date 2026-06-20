import { auth } from "@/auth";
import { getDb } from "@/db/client";
import { logins } from "@/db/schema";

export const runtime = "nodejs";

/** POST /api/track/login — records one sign-in event for the current session.
 *  The client fires this once per browser session; email comes from the trusted
 *  server session, location/IP from the edge/proxy headers. Never trusts the
 *  client for identity. */
export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ tracked: false }, { status: 401 });

  const h = req.headers;
  const ipAddress = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip"))?.trim() || null;

  try {
    const db = getDb();
    await db.insert(logins).values({
      email,
      name: session.user?.name ?? null,
      ipAddress,
      city: decodeHeader(h.get("x-vercel-ip-city")),
      region: decodeHeader(h.get("x-vercel-ip-country-region")),
      country: decodeHeader(h.get("x-vercel-ip-country")),
      userAgent: h.get("user-agent") ?? null,
    });
    return Response.json({ tracked: true }, { status: 201 });
  } catch (e) {
    // Tracking must never break the app — log shape, return soft failure.
    const message = e instanceof Error ? e.message : "tracking failed";
    return Response.json({ tracked: false, error: message }, { status: 200 });
  }
}

/** Vercel URL-encodes geo header values (e.g. "San%20Francisco"). */
function decodeHeader(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
