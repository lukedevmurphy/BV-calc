"use client";

import { useState } from "react";
import type { SectionOutput } from "@/lib/types";
import { btnPrimary } from "./ui";

interface Props {
  companyName: string;
  sections: SectionOutput[];
  sectionsPending?: boolean;
  /** Footer chrome only; section warnings are already gated in `sections`. */
  presentationMode?: "draft" | "client";
}

/**
 * POSTs the SAME computed SectionOutput[] the preview renders to /api/pptx
 * and downloads the result — one source object, two outputs. Download goes
 * through a blob + anchor click (window.open would lose the POST body).
 */
export default function ExportButton({
  companyName,
  sections,
  sectionsPending = false,
  presentationMode = "draft",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPptx() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, sections, presentationMode }),
      });
      if (!res.ok) throw new Error(`export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "proposal.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={exportPptx}
        disabled={busy || sectionsPending || sections.length === 0}
        className={btnPrimary}
      >
        {busy
          ? "Exporting…"
          : sectionsPending
            ? "Updating preview…"
            : "Export to PowerPoint"}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
