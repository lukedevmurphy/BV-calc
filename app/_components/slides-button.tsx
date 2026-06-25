"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import type { SectionOutput } from "@/lib/types";
import { btnSecondary } from "./ui";

interface Props {
  companyName: string;
  sections: SectionOutput[];
  sectionsPending?: boolean;
  /** Footer chrome; section warnings are already gated in `sections`. */
  presentationMode?: "draft" | "client";
}

/**
 * POSTs the SAME computed SectionOutput[] the preview renders to /api/slides,
 * which uploads the generated .pptx to the user's Google Drive and converts it
 * to a native Google Slides deck, then opens it in a new tab. If the user
 * hasn't granted Drive access yet (signed in before the scope existed, or the
 * token can't refresh), the route returns `reconnect-google` and we kick off a
 * fresh Google consent.
 */
export default function SlidesButton({
  companyName,
  sections,
  sectionsPending = false,
  presentationMode = "draft",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  async function exportSlides() {
    setBusy(true);
    setError(null);
    setNeedsConnect(false);
    try {
      const res = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, sections, presentationMode }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 401 || data.error === "reconnect-google") {
        setNeedsConnect(true);
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? `export failed (${res.status})`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "export failed");
    } finally {
      setBusy(false);
    }
  }

  if (needsConnect) {
    return (
      <button onClick={() => signIn("google")} className={btnSecondary}>
        Connect Google Drive to export →
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={exportSlides}
        disabled={busy || sectionsPending || sections.length === 0}
        className={btnSecondary}
      >
        {busy ? "Opening in Google Slides…" : "Export to Google Slides"}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
