"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SavedCase {
  id: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lists recently saved business cases (GET /api/proposals) and links each to
 * /p/[id], which rehydrates the builder. Renders nothing when there are no
 * saved cases or no database is configured — it's an additive convenience on
 * the entry screen, never a blocker for starting a new proposal.
 */
export default function SavedCasesList() {
  const [cases, setCases] = useState<SavedCase[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/proposals")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (alive) setCases(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setCases([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!cases || cases.length === 0) return null;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Load a saved business case</h2>
        <span className="text-[11px] text-ink-tertiary">
          {cases.length} saved
        </span>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {cases.map((c) => (
          <li key={c.id}>
            <Link
              href={`/p/${c.id}`}
              className="flex items-center justify-between gap-3 py-2.5 hover:text-accent"
            >
              <span className="text-sm font-medium">{c.companyName}</span>
              <span className="shrink-0 text-[11px] text-ink-tertiary">
                updated {fmtDate(c.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
