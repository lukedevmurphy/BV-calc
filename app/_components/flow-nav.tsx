"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export type Screen = "inputs" | "build" | "preview" | "settings";

const STEPS: { id: Screen; label: string; n: number }[] = [
  { id: "inputs", label: "Inputs", n: 1 },
  { id: "build", label: "Build", n: 2 },
  { id: "preview", label: "Preview", n: 3 },
];

/**
 * Top bar shared across the three-screen flow: a clickable step indicator
 * (Inputs → Build → Preview), a Settings gear (assumptions, separate from the
 * flow), and a slot for the Save action. State lives in the Builder, so jumping
 * between steps never loses work.
 */
export default function FlowNav({
  screen,
  onNavigate,
  companyName,
  onEditCompany,
  saveSlot,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  companyName: string;
  onEditCompany: () => void;
  saveSlot: ReactNode;
}) {
  const activeN = STEPS.find((s) => s.id === screen)?.n ?? 0;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <div className="min-w-0">
          <div className="truncate font-serif text-lg font-semibold tracking-tight">
            {companyName}
          </div>
          <button
            onClick={onEditCompany}
            className="text-[11px] text-ink-secondary underline-offset-2 hover:text-accent hover:underline"
          >
            edit company profile
          </button>
        </div>

        <nav className="flex items-center gap-1">
          {STEPS.map((s) => {
            const active = s.id === screen;
            const done = s.n < activeN;
            return (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-accent text-white"
                    : "text-ink-secondary hover:bg-muted"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                    active
                      ? "bg-white/25"
                      : done
                        ? "bg-accent text-white"
                        : "border border-line text-ink-tertiary"
                  }`}
                >
                  {s.n}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-line px-2.5 py-2 text-xs font-medium text-ink-secondary hover:bg-muted"
          >
            Analytics
          </Link>
          <button
            onClick={() => onNavigate("settings")}
            title="Assumptions & settings"
            className={`rounded-lg border px-2.5 py-2 text-sm hover:bg-muted ${
              screen === "settings" ? "border-accent text-accent" : "border-line text-ink-secondary"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {saveSlot}
        </div>
      </div>
    </header>
  );
}
