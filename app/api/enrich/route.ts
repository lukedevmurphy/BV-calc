import { getEnrichmentProvider } from "@/lib/enrichment/provider";

export async function POST(req: Request): Promise<Response> {
  let companyName: string;
  try {
    const body = (await req.json()) as { companyName?: string };
    companyName = body.companyName ?? "";
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!companyName.trim()) {
    return Response.json({ error: "companyName is required" }, { status: 400 });
  }

  const profile = await getEnrichmentProvider().enrich(companyName);
  return Response.json(profile);
}
