# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev                          # dev server on :3000
npm run build                        # production build (don't run while dev server is up — clobbers .next)
npm run typecheck                    # tsc --noEmit

# Verification scripts (the de-facto test suite — keep them passing)
npx tsx scripts/check-engine.ts      # economics invariants: band ordering, funnel widening, cost monotonic in adoption
npx tsx scripts/check-sections.ts    # all 12 sections: JSON round-trip, exec-summary consistency with detail sections
npx tsx scripts/check-pptx.ts        # REQUIRES running dev server: asserts the .pptx contains the web preview's text verbatim

# Database (only needed for save/load; the app runs fully without it)
npx drizzle-kit push                 # apply schema to Neon (reads DATABASE_URL from .env.local)
npx drizzle-kit generate             # regenerate migration SQL after editing db/schema.ts
```

## The keystone rule (do not break this)

Every section module returns a structured `SectionOutput` object — **never prose or HTML**. Two independent consumers render that same object:

```
lib/sections/*  →  SectionOutput  ─┬→  web preview   (app/_components/section-card.tsx + Recharts)
                                   └→  pptx export   (lib/pptx/slide-builders.ts + PptxGenJS, /api/pptx only)
```

If you add a field to `SectionOutput` (lib/types.ts), you must handle it in **both** consumers, and `scripts/check-pptx.ts` should assert it survives into the deck. Any AI- or template-generated text must be decomposed into the structured fields (title, bullets, stats, table, charts, speakerNotes) — never emitted as a blob.

`SectionOutput` is the wire format three times over (React state, /api/pptx POST body, Neon jsonb), so it must stay plain JSON — no Dates, classes, NaN, or Infinity (`computeAllSections` has a dev-only guard that throws on non-finite numbers).

## Architecture

- **Section modules** (`lib/sections/*.ts`) are pure synchronous functions `(ProposalContext) => SectionOutput`, registered in `lib/sections/index.ts`. Because they're pure and dependency-free, the entire 12-section pipeline recomputes in the browser on every assumptions change (`useMemo` in `app/_components/builder.tsx`, smoothed with `useDeferredValue`). Keep them synchronous; the public `SectionModule` type allows Promise only for future async modules.
- **Computation order ≠ display order.** `computeAllSections` runs modules in `COMPUTE_ORDER` (economic trio before sections that reference their figures; `executive_summary` always LAST), then stamps display `order`/`enabled` from `sectionConfig`. The exec summary reads only `priorSections.*.rangedFigures` and stats — it calls no engine function, so it can never contradict the detail sections. Disabled sections are still computed (their figures feed the exec summary) but filtered from preview and export.
- **Economics engine** (`lib/economics/`) is the single formula spine; sections never reimplement ramp math. Cost spine: `activeUsers(breadth) × tasksPerUser × depth × tokensPerTask × blended $/token`. Value is bottom-up per use case (hours saved × loaded cost × instances), never top-down %. The two-dimensional ramp (adoption breadth × usage depth) multiplies BOTH cost and value volumes.
- **The anti-paired math is the classic bug to avoid:** for value-vs-cost comparisons, conservative = LOW value vs HIGH cost. Only `netVsCost`, `ratioVsCost` (lib/economics/ranged.ts) and the break-even edge logic (engine.ts) may pair low-with-high. Element-wise `map2`/`mul`/`add` are correct only when both inputs move the output the same direction. Never hand-roll `value.low - cost.low`.
- **Enrichment** is mocked behind `EnrichmentProvider` (`lib/enrichment/provider.ts` is the swap point). Section modules import only `CompanyProfile` from lib/types.ts — a real provider must require zero section changes. The user-editable confirm/edit step in `company-step.tsx` is a deliberate feature, not a stopgap.
- **PptxGenJS stays server-side**: `lib/pptx/` is imported only by `app/api/pptx/route.ts` (`runtime = "nodejs"`, `serverExternalPackages` in next.config.ts, `write({outputType:"nodebuffer"})` — never writeFile, Vercel FS is read-only). Banded charts render as 3 line series per band (low/base/high) because PptxGenJS can't shade ranges.
- **Persistence**: one `proposals` table (jsonb `ProposalPayload` = inputs + computed snapshot). `/p/[id]` rehydrates the builder from the stored inputs, so live recompute keeps working on saved proposals. Charts must be `"use client"` with explicit-height parents (Recharts SSR measures 0×0) and `isAnimationActive={false}` (live reflow would replay animations).

## Placeholder data — confirm before presenting

- `lib/data/defaults.ts` — Codex model names/prices are placeholders (seeded June 2026) with a TODO; they live ONLY there and are fully user-editable. Nothing in engine or sections may reference a model name.
- `lib/sections/product.ts` — Anthropic pre-built template mapping is a placeholder list; verify against anthropic.com.
- `lib/enrichment/mock.ts` — company profiles are fictional demo data, labeled as such.

## Conventions

- TypeScript strict, path alias `@/*` → repo root. Tailwind v4 (`@theme` tokens in app/globals.css; chart colors are the `--chart-*` vars mirrored in `lib/pptx/slide-builders.ts` — keep web and deck palettes in sync). No shadcn; custom components in `app/_components/`.
- All display strings for numbers go through `lib/format.ts` so web and pptx text stay byte-identical.
- v1 makes no AI calls anywhere by deliberate decision; AI drafting/polish slots in later behind the existing `SectionModule` interface or a new server route.
