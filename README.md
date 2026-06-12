# bv-calc — Business Value Proposal Generator

Section-based business-value proposal builder for a consumption-based AI product
(Anthropic / Claude). Compose a proposal from 12 toggleable, reorderable sections;
every section produces structured data (`SectionOutput`) that renders to a web
preview **and** exports to PowerPoint from the same object. All economics carry
conservative / base / optimistic ranges driven by one shared scenario object
(two-dimensional adoption ramp: breadth × depth).

## Run it

```sh
npm install
npm run dev          # http://localhost:3000
```

Works fully without any environment variables (the builder, live recompute, and
PowerPoint export need no services). Saving/loading proposals needs Neon:

```sh
cp .env.example .env.local   # fill in DATABASE_URL (Neon pooled connection)
npx drizzle-kit push         # creates the proposals table
```

## ⚠️ Placeholder data to confirm at build time

- **Claude model names + pricing** — `lib/data/defaults.ts` seeds the model mix
  from published prices as of June 2026. Confirm current pricing before
  presenting; every row is editable in the UI and nothing else references a
  model name.
- **Anthropic pre-built template list** — `lib/sections/product.ts` maps use
  cases to template suggestions that change monthly; verify on anthropic.com.
- **Company profiles are mocked** — `MockEnrichmentProvider` ships fictional
  demo firms, clearly labeled. The confirm/edit step in the UI is mandatory by
  design. A real provider swaps in via `lib/enrichment/provider.ts` with zero
  changes to section modules.

## Architecture

```
section module  →  SectionOutput (structured data, never prose)
                        │
            ┌───────────┴───────────┐
        web renderer            pptx exporter
   (section-card.tsx +     (lib/pptx/slide-builders.ts +
    Recharts, client)        PptxGenJS, /api/pptx only)
```

- **The keystone rule:** modules return data, not prose/HTML. The two renderers
  consume identical objects — `scripts/check-pptx.ts` asserts the deck contains
  the web preview's text verbatim.
- **Section modules** (`lib/sections/*`) are pure synchronous functions
  `(ProposalContext) => SectionOutput`, so the whole pipeline recomputes in the
  browser on every slider change (`useMemo` in `builder.tsx`). The executive
  summary computes **last** and reads only other sections' `rangedFigures` —
  it cannot contradict the detail below it.
- **Economics engine** (`lib/economics/`) is the single formula spine.
  Cost = activeUsers(breadth) × tasks/user × depth × tokens/task × blended
  $/token. Value is built bottom-up per use case (hours saved × loaded cost ×
  volume). The anti-paired operations (`netVsCost`, `ratioVsCost`, break-even
  edges: conservative = low value vs HIGH cost) live in `ranged.ts`/`engine.ts`
  so sections can't hand-roll them wrong.
- **Persistence**: one `proposals` table (Neon, jsonb payload = inputs +
  computed snapshot). Reloading rehydrates the builder, so live recompute keeps
  working on saved proposals.

## Verification scripts

```sh
npx tsx scripts/check-engine.ts     # band ordering, funnel widening, cost monotonicity, break-even
npx tsx scripts/check-sections.ts   # all 12 sections, JSON round-trip, exec-summary consistency
npx tsx scripts/check-pptx.ts       # needs dev server: deck text === preview text, notes, charts
```

## Deliberately out of v1

Real enrichment (web/EDGAR), AI-generated narrative & exec-summary polish (slots
in behind `SectionModule` / a future `/api/polish` without interface changes),
Google Slides export, auth/multi-user. Additional industry verticals drop into
`lib/data/use-cases.ts` without touching anything else.
