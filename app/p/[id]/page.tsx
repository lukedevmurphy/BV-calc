import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db/client";
import { proposals } from "@/db/schema";
import Builder from "@/app/_components/builder";

export const dynamic = "force-dynamic";

/** Loads a saved proposal and rehydrates the builder — live recompute keeps
 *  working because the payload stores the inputs, not just the snapshot. */
export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const db = getDb();
    const [row] = await db.select().from(proposals).where(eq(proposals.id, id));
    if (!row) return <Message text="Proposal not found." />;

    const p = row.payload;
    return (
      <Builder
        proposalId={row.id}
        initial={{
          company: p.company,
          assumptions: p.assumptions,
          useCaseIds: p.selectedUseCaseIds,
          sectionConfig: p.sectionConfig,
        }}
      />
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "database error";
    return <Message text={msg} />;
  }
}

function Message({ text }: { text: string }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p className="text-sm text-ink-secondary">{text}</p>
      <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        ← Start a new proposal
      </Link>
    </main>
  );
}
