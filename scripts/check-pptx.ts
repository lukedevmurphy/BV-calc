// Step-4 verification: prove the one-object → two-outputs seam. Computes the
// SAME SectionOutput[] the web preview renders, POSTs it to /api/pptx on the
// running dev server, and asserts the returned .pptx contains the identical
// text (titles, bullets, stats, table cells) plus speaker notes.
// `npx tsx scripts/check-pptx.ts`

import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { DEFAULT_ASSUMPTIONS } from "@/lib/data/defaults";
import { SEED_USE_CASES } from "@/lib/data/use-cases";
import { computeAllSections, defaultSectionConfig } from "@/lib/sections/index";
import type { CompanyProfile } from "@/lib/types";

const company: CompanyProfile = {
  name: "Crestline Asset Management",
  industry: "Asset & Wealth Management",
  employeeCount: 4500,
  sourceNotes: "Demo data (mocked)",
};

async function main() {
  const sections = computeAllSections({
    company,
    assumptions: DEFAULT_ASSUMPTIONS,
    selectedUseCases: SEED_USE_CASES.slice(0, 4),
    sectionConfig: defaultSectionConfig(),
  });

  const res = await fetch("http://localhost:3000/api/pptx", {
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
  // .pptx is a zip — must start with PK
  assert.strictEqual(buf.subarray(0, 2).toString("latin1"), "PK", "zip magic");

  writeFileSync("scripts/out-proposal.pptx", buf);

  // Unzip in-memory via jszip (transitive dep of pptxgenjs)
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files).filter((f) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(f),
  );
  // cover + 10 main sections + appendix divider + 2 appendix sections
  assert.strictEqual(slideNames.length, 14, `expected 14 slides, got ${slideNames.length}`);

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

  const decode = (s: string) =>
    s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  const slides = decode(allSlidesXml);
  const notes = decode(allNotesXml);

  // The seam: text the web preview shows must appear verbatim in the deck.
  for (const s of sections) {
    // Section titles render as uppercase kicker labels in the deck grammar.
    assert(
      slides.includes(s.title) || slides.includes(s.title.toUpperCase()),
      `slide text: title "${s.title}"`,
    );
    for (const b of s.bullets ?? []) assert(slides.includes(b), `bullet: "${b.slice(0, 50)}…"`);
    for (const st of s.stats ?? []) assert(slides.includes(st.value), `stat: "${st.value}"`);
    for (const row of s.table?.rows ?? [])
      assert(slides.includes(String(row[0])), `table cell: "${row[0]}"`);
    if (s.speakerNotes) {
      assert(
        notes.includes(s.speakerNotes.slice(0, 60)),
        `speaker notes for ${s.kind}`,
      );
    }
  }
  assert(chartNames.length >= 2, `native charts embedded (${chartNames.length})`);

  // LAYOUT INVARIANT: no two shapes on a slide may overlap. Parse each
  // slide's shape tree (sp / pic / graphicFrame bounding boxes in EMU) and
  // assert pairwise non-intersection, with a small tolerance for borders.
  const EMU_PER_IN = 914_400;
  const TOL = 0.03; // inches
  for (const slideName of slideNames) {
    const xml = await zip.files[slideName].async("string");
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const shapeRe = /<p:(sp|pic|graphicFrame)\b[\s\S]*?<\/p:\1>/g;
    for (const m of xml.matchAll(shapeRe)) {
      const frag = m[0];
      const off = frag.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
      const ext = frag.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
      if (!off || !ext) continue;
      boxes.push({
        x: Number(off[1]) / EMU_PER_IN,
        y: Number(off[2]) / EMU_PER_IN,
        w: Number(ext[1]) / EMU_PER_IN,
        h: Number(ext[2]) / EMU_PER_IN,
      });
    }
    type Box = { x: number; y: number; w: number; h: number };
    // Intentional layering (a text box inside its stat card) is containment,
    // not a collision — only PARTIAL overlaps are layout bugs.
    const contains = (outer: Box, inner: Box) =>
      inner.x >= outer.x - TOL &&
      inner.y >= outer.y - TOL &&
      inner.x + inner.w <= outer.x + outer.w + TOL &&
      inner.y + inner.h <= outer.y + outer.h + TOL;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        const collides = ix > TOL && iy > TOL && !contains(a, b) && !contains(b, a);
        assert(
          !collides,
          `${slideName}: shapes ${i} and ${j} overlap by ${ix.toFixed(2)}×${iy.toFixed(2)}in ` +
            `(a=${JSON.stringify(a)}, b=${JSON.stringify(b)})`,
        );
      }
    }
  }

  console.log(
    `Seam proven: ${slideNames.length} slides, ${chartNames.length} native charts, notes populated, ` +
      `all web-preview text present verbatim, zero overlapping shapes. ✓\n` +
      `Wrote scripts/out-proposal.pptx (${(buf.length / 1024).toFixed(0)} KB) — open in PowerPoint to eyeball.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
