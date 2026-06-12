"use client";

import { useState } from "react";
import type { ProposalPayload } from "@/lib/types";

interface Props {
  proposalId: string | null;
  payload: ProposalPayload;
  onSaved: (id: string) => void;
}

/** Persists the full proposal (inputs + computed snapshot) to Neon.
 *  First save POSTs, later saves PUT the same row. */
export default function SaveButton({ proposalId, payload, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(
        proposalId ? `/api/proposals/${proposalId}` : "/api/proposals",
        {
          method: proposalId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? `save failed (${res.status})`);
      }
      onSaved(data.id);
      setStatus("saved");
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save failed";
      setStatus(msg.includes("DATABASE_URL") ? "no database configured" : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium shadow-card hover:bg-muted disabled:opacity-50"
      >
        {busy ? "Saving…" : proposalId ? "Save changes" : "Save proposal"}
      </button>
      {status && (
        <span
          className={`text-xs ${status === "saved" ? "text-green-700" : "text-red-600"}`}
        >
          {status}
        </span>
      )}
    </div>
  );
}
