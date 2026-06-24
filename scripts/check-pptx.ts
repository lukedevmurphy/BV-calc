// Step-4 verification: the one-object → two-outputs seam AND the slide-fit
// engine. `npx tsx scripts/check-pptx.ts`
//
//   1. SEAM (HTTP, needs the dev server): POST the computed SectionOutput[] to
//      /api/pptx and assert the deck contains the web-preview text verbatim,
//      notes, charts, no overlapping shapes — and NOTHING out of bounds.
//   2. BOUNDS SWEEP (in-process): build every seed company's deck in BOTH value
//      approaches via the shared buildDeck() and assert no shape exceeds the
//      slide frame — horizontally OR vertically. This is the regression guard
//      for the two overflow bugs the slide-fit engine fixes.
//   3. FIT DECISIONS (plan-level): confirm a content-heavy Business Value
//      summarizes (top rows + rollup on the main slide, full table to the
//      appendix), that a slightly-over slide COMPACTS before it splits, and that
//      a genuinely-overlong core slide SPLITS to (1 of 2)/(2 of 2).

import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { DEFAULT_ASSUMPTIONS } from "@/lib/data/defaults";
import { SEED_USE_CASES, resolveUseCases, useCasesByIndustry } from "@/lib/data/use-cases";
import { computeAllSections, defaultSectionConfig } from "@/lib/sections/index";
import { buildDeck } from "@/lib/pptx/build-deck";
import { planSection } from "@/lib/slide-fit/plan";
import {
  PAGE_W,
  PAGE_H,
  CONTENT_BOTTOM,
  KEEP_ROWS,
  MIN_FONT_SCALE,
} from "@/lib/slide-fit/metrics";
import { MockEnrichmentProvider, SEEDED_COMPANY_NAMES } from "@/lib/enrichment/mock";
import { getValuePrefillProvider } from "@/lib/value-model/prefill/provider";
import { resolveSubIndustry } from "@/lib/value-model/sub-industry";
import { ILLUSTRATIVE_FLAG } from "@/lib/provenance";
import type { CompanyProfile, SectionOutput, ValueApproach } from "@/lib/types";

const EMU = 914_400;
const TOL = 0.05; // inches

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// Compare rendered text rather than raw XML adjacency. A single visible value
// may intentionally use multiple rich-text runs (for example, bold base value
// plus a regular-weight confidence range) while remaining byte-identical on
// the slide.
const visibleText = (xml: string) =>
  decode(xml.replace(/<a:br\s*\/>/g, "\n").replace(/<[^>]+>/g, ""));

interface Box { x: number; y: number; w: number; h: number }

function parseBoxes(xml: string): Box[] {
  const boxes: Box[] = [];
  const shapeRe = /<p:(sp|pic|graphicFrame)\b[\s\S]*?<\/p:\1>/g;
  for (const m of xml.matchAll(shapeRe)) {
    const off = m[0].match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const ext = m[0].match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    if (!off || !ext) continue;
    boxes.push({
      x: Number(off[1]) / EMU,
      y: Number(off[2]) / EMU,
      w: Number(ext[1]) / EMU,
      h: Number(ext[2]) / EMU,
    });
  }
  return boxes;
}

/** Assert every shape on every slide stays inside the frame — horizontally
 *  (BUG A) and vertically (BUG B). Section slides (master footer lives in the
 *  master, not the slide) are held to the CONTENT frame; the cover and the dark
 *  appendix divider draw their own footers, so they're held to the page edge. */
async function assertInBounds(buf: Buffer, ctx: string): Promise<number> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort();
  let checked = 0;
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string");
    const isCover = xml.includes("EXECUTIVE OVERVIEW");
    const isDivider = xml.includes("SUPPORTING DETAIL");
    const vMax = isCover || isDivider ? PAGE_H : CONTENT_BOTTOM;
    for (const b of parseBoxes(xml)) {
      assert(b.x >= -TOL, `${ctx} ${name}: shape off LEFT edge (x=${b.x.toFixed(2)})`);
      assert(b.y >= -TOL, `${ctx} ${name}: shape off TOP edge (y=${b.y.toFixed(2)})`);
      assert(
        b.x + b.w <= PAGE_W + TOL,
        `${ctx} ${name}: shape off RIGHT edge (x+w=${(b.x + b.w).toFixed(2)} > ${PAGE_W})`,
      );
      assert(
        b.y + b.h <= vMax + TOL,
        `${ctx} ${name}: content past the bottom (y+h=${(b.y + b.h).toFixed(2)} > ${vMax.toFixed(2)})`,
      );
      checked++;
    }
  }
  return checked;
}

/** Build a seed company's sections exactly as the builder does on confirm. */
async function sectionsFor(
  company: CompanyProfile,
  approach: ValueApproach,
): Promise<SectionOutput[]> {
  const sub = resolveSubIndustry(company.industry);
  const useCases = resolveUseCases(sub.rankedUseCaseIds);
  const valueModel = await getValuePrefillProvider().prefill({ company, approach, useCases });
  return computeAllSections({
    company,
    assumptions: { ...DEFAULT_ASSUMPTIONS, valueApproach: approach },
    selectedUseCases: useCases,
    valueModel,
    sectionConfig: defaultSectionConfig(),
  });
}

async function main() {
  const enricher = new MockEnrichmentProvider();

  // ── 1. SEAM (HTTP) ─────────────────────────────────────────────────────────
  const company: CompanyProfile = {
    name: "Crestline Asset Management",
    industry: "Asset & Wealth Management",
    employeeCount: 4500,
    sourceNotes: "Demo data (mocked)",
  };
  const sections = computeAllSections({
    company,
    assumptions: DEFAULT_ASSUMPTIONS,
    selectedUseCases: SEED_USE_CASES.slice(0, 4),
    sectionConfig: defaultSectionConfig(),
  });

  const baseUrl = process.env.PPTX_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/pptx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName: company.name, sections }),
  });
  assert.strictEqual(res.status, 200, `pptx route status ${res.status}`);
  assert.match(
    res.headers.get("content-type") ?? "",
    /presentationml\.presentation/,
    "content type",
  );
  const buf = Buffer.from(await res.arrayBuffer());
  assert(buf.length > 10_000, `pptx non-trivial size (${buf.length})`);
  assert.strictEqual(buf.subarray(0, 2).toString("latin1"), "PK", "zip magic");
  writeFileSync("scripts/out-proposal.pptx", buf);

  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files).filter((f) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(f),
  );
  // cover + main flow + divider + appendix (forecast, cost, 2 scenarios). With
  // the Crestline default content nothing splits/summarizes, but assert the
  // STRUCTURE rather than a magic count so the fit engine can add slides freely.
  assert(slideNames.length >= 14, `expected the full deck, got ${slideNames.length} slides`);

  const allSlidesXml = (
    await Promise.all(slideNames.map((n) => zip.files[n].async("string")))
  ).join("\n");
  const notesNames = Object.keys(zip.files).filter((f) =>
    /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f),
  );
  const allNotesXml = (
    await Promise.all(notesNames.map((n) => zip.files[n].async("string")))
  ).join("\n");
  const chartNames = Object.keys(zip.files).filter((f) => /chart\d*\.xml$/.test(f));

  const slides = visibleText(allSlidesXml);
  const notes = visibleText(allNotesXml);

  // The seam: web-preview text must appear verbatim somewhere in the deck (on a
  // main, split, or appendix slide).
  for (const s of sections) {
    assert(
      slides.includes(s.title) || slides.includes(s.title.toUpperCase()),
      `slide text: title "${s.title}"`,
    );
    for (const b of s.bullets ?? []) assert(slides.includes(b), `bullet: "${b.slice(0, 50)}…"`);
    for (const st of s.stats ?? []) assert(slides.includes(st.value), `stat: "${st.value}"`);
    for (const row of s.table?.rows ?? [])
      assert(slides.includes(String(row[0])), `table cell: "${row[0]}"`);
    if (s.speakerNotes) {
      assert(notes.includes(s.speakerNotes.slice(0, 60)), `speaker notes for ${s.kind}`);
    }
  }
  assert(chartNames.length >= 2, `native charts embedded (${chartNames.length})`);
  assert(slides.includes(ILLUSTRATIVE_FLAG), "illustrative-seed provenance flag present");
  assert(slides.includes("BASE CASE"), "Base-case nugget present on main slides");
  // The scenario slides render their tag/kicker uppercased; match either case
  // (the divider's title-case TOC truncates to "+N more" once the appendix grows,
  // so assert the slide itself, like the seam loop does for section titles).
  assert(
    slides.includes("Conservative Case") || slides.includes("CONSERVATIVE CASE"),
    "Conservative case appendix slide present",
  );
  assert(
    slides.includes("Upside Case") || slides.includes("UPSIDE CASE"),
    "Upside case appendix slide present",
  );

  // Coding-efficiency driver survives the seam: its slide + stats reach the deck.
  const codingSeam = sections.find((s) => s.kind === "coding_efficiency");
  assert(codingSeam, "coding_efficiency section present in the seam deck");
  assert(slides.includes("Coding Efficiency"), "Coding Efficiency slide rendered");
  for (const st of codingSeam!.stats ?? [])
    assert(slides.includes(st.value), `coding stat verbatim in deck: ${st.value}`);

  // Overlap invariant (pairwise non-intersection; containment allowed) + bounds.
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string");
    const boxes = parseBoxes(xml);
    const contains = (o: Box, i: Box) =>
      i.x >= o.x - TOL && i.y >= o.y - TOL &&
      i.x + i.w <= o.x + o.w + TOL && i.y + i.h <= o.y + o.h + TOL;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        const collides = ix > TOL && iy > TOL && !contains(a, b) && !contains(b, a);
        assert(!collides, `${name}: shapes ${i}/${j} overlap ${ix.toFixed(2)}×${iy.toFixed(2)}in`);
      }
    }
  }
  const seamShapes = await assertInBounds(buf, "seam");
  console.log(
    `Seam proven: ${slideNames.length} slides, ${chartNames.length} charts, notes + text verbatim, ` +
      `${seamShapes} shapes all in-bounds, zero overlap. ✓`,
  );

  // ── 2. BOUNDS SWEEP — every seed × both approaches, in-process ──────────────
  let sweepShapes = 0;
  let sweepDecks = 0;
  for (const name of SEEDED_COMPANY_NAMES) {
    const profile = await enricher.enrich(name);
    for (const approach of ["bottom_up", "top_down"] as ValueApproach[]) {
      const secs = await sectionsFor(profile, approach);
      const deck = buildDeck(profile.name, secs);
      const nb = (await deck.write({ outputType: "nodebuffer" })) as Buffer;
      sweepShapes += await assertInBounds(nb, `${name}/${approach}`);
      sweepDecks++;
    }
  }
  console.log(
    `Bounds sweep: ${sweepDecks} decks (${SEEDED_COMPANY_NAMES.length} seeds × 2 approaches), ` +
      `${sweepShapes} shapes — none off-frame (horizontal or vertical). ✓`,
  );

  // ── 3. FIT DECISIONS (plan-level) ───────────────────────────────────────────
  // 3a. Content-heavy Business Value → SUMMARIZE (top KEEP_ROWS + rollup on the
  //     main slide; full table on an appendix slide).
  const awmAll = useCasesByIndustry("Asset & Wealth Management"); // 10 use cases
  const heavy = computeAllSections({
    company,
    assumptions: DEFAULT_ASSUMPTIONS,
    selectedUseCases: awmAll,
    sectionConfig: defaultSectionConfig(),
  });
  const bv = heavy.find((s) => s.kind === "business_value")!;
  const bvPlan = planSection(bv);
  assert(bvPlan.length === 2, `content-heavy BV should summarize to 2 slides (got ${bvPlan.length})`);
  assert(bvPlan[0].decision === "summarize", `BV main decision summarize (got ${bvPlan[0].decision})`);
  assert(bvPlan[0].placement === "main", "BV summary stays in the main flow");
  assert(
    bvPlan[0].section.table!.rows.length === KEEP_ROWS + 1,
    `BV main keeps ${KEEP_ROWS} rows + a rollup (got ${bvPlan[0].section.table!.rows.length})`,
  );
  assert(
    String(bvPlan[0].section.table!.rows[KEEP_ROWS][0]).toLowerCase().includes("more"),
    "BV main has a '+ N more' rollup row",
  );
  assert(bvPlan[1].placement === "appendix", "BV full detail goes to the appendix");
  assert(
    bvPlan[1].section.table!.rows.length === awmAll.length,
    `BV appendix carries all ${awmAll.length} rows (got ${bvPlan[1].section.table!.rows.length})`,
  );
  // And the heavy deck stays in-bounds.
  const heavyDeck = buildDeck(company.name, heavy);
  const heavyBuf = (await heavyDeck.write({ outputType: "nodebuffer" })) as Buffer;
  await assertInBounds(heavyBuf, "content-heavy-BV");
  console.log(
    `Summarize: BV with ${awmAll.length} use cases → ${KEEP_ROWS} + rollup on main, ` +
      `full ${awmAll.length} in appendix, in-bounds. ✓`,
  );

  // 3b. COMPACT-before-split: a slightly-over bullet slide shrinks within the
  //     readable floor rather than splitting.
  const bullet = (n: number) =>
    `Driver ${n}: a defensible, CFO-legible line of reasoning that ties this workflow to measured hours saved, realization-adjusted to dollars and rolled into the value case`;
  const slightlyOver: SectionOutput = {
    id: "t_compact", kind: "problem", title: "Compaction Probe",
    subtitle: "A slide a little too tall for its frame",
    bullets: Array.from({ length: 10 }, (_, i) => bullet(i + 1)),
    order: 1, enabled: true,
  };
  const cPlan = planSection(slightlyOver);
  assert(cPlan.length === 1 && cPlan[0].decision === "compact", `slightly-over should COMPACT (got ${cPlan.map((p) => p.decision)})`);
  assert(
    cPlan[0].fontScale < 1 && cPlan[0].fontScale >= MIN_FONT_SCALE - 1e-9,
    `compaction scale within the readable floor (got ${cPlan[0].fontScale})`,
  );
  console.log(`Compaction: 10-bullet slide compacts to ×${cPlan[0].fontScale} (≥ floor ${MIN_FONT_SCALE}), no split. ✓`);

  // 3c. SPLIT: a genuinely-overlong core slide can't compact → (1 of 2)/(2 of 2).
  const wayOver: SectionOutput = {
    id: "t_split", kind: "problem", title: "Split Probe",
    subtitle: "A slide with far too much core narrative",
    bullets: Array.from({ length: 18 }, (_, i) => bullet(i + 1)),
    order: 1, enabled: true,
  };
  const sPlan = planSection(wayOver);
  assert(sPlan.length === 2 && sPlan.every((p) => p.decision === "split"), `overlong core should SPLIT (got ${sPlan.map((p) => p.decision)})`);
  assert(sPlan[0].section.title.includes("(1 of 2)"), "first split slide titled (1 of 2)");
  assert(sPlan[1].section.title.includes("(2 of 2)"), "second split slide titled (2 of 2)");
  assert(
    (sPlan[0].section.bullets!.length + sPlan[1].section.bullets!.length) === 18,
    "split preserves every bullet across the two slides",
  );
  console.log(`Split: 18-bullet core slide → "(1 of 2)" + "(2 of 2)", all bullets preserved. ✓`);

  console.log(
    `\nSlide-fit verified. Wrote scripts/out-proposal.pptx (${(buf.length / 1024).toFixed(0)} KB).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
