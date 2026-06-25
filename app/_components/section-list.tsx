"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionConfigEntry, SectionKind, SectionOutput } from "@/lib/types";
import SectionCard from "./section-card";

interface Props {
  /** All computed sections, sorted by order (disabled ones included). */
  sections: SectionOutput[];
  config: SectionConfigEntry[];
  onConfigChange: (config: SectionConfigEntry[]) => void;
}

const DIVIDER_ID = "__appendix_divider__";

/**
 * The Build screen body — FLIPPED layout (nav left, cards right). The left nav
 * has an APPENDIX LANE: a draggable divider splits the list, sections dragged
 * BELOW it become appendix content (rendered after the main deck in Preview and
 * export). Reordering / re-laning rewrites sectionConfig so all consumers stay
 * in lockstep.
 */
export default function SectionList({ sections, config, onConfigChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const [collapsed, setCollapsed] = useState<Set<SectionKind>>(new Set());
  const collapseAll = () => setCollapsed(new Set(sections.map((s) => s.kind)));
  const expandAll = () => setCollapsed(new Set());
  const toggleCollapse = (kind: SectionKind) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  const jumpTo = (kind: SectionKind) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(kind);
      return next;
    });
    setTimeout(() => {
      document
        .getElementById(`section-${kind}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const main = ordered.filter((s) => !s.appendix);
  const appendix = ordered.filter((s) => s.appendix);
  // Sortable list: main kinds, the divider sentinel, then appendix kinds.
  const navIds = [
    ...main.map((s) => s.kind as string),
    DIVIDER_ID,
    ...appendix.map((s) => s.kind as string),
  ];

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const moved = arrayMove(
      navIds,
      navIds.indexOf(active.id as string),
      navIds.indexOf(over.id as string),
    );
    const divIdx = moved.indexOf(DIVIDER_ID);
    let order = 0;
    const updates = new Map<string, { order: number; appendix: boolean }>();
    moved.forEach((id, i) => {
      if (id === DIVIDER_ID) return;
      updates.set(id, { order: order++, appendix: i > divIdx });
    });
    onConfigChange(
      config.map((c) =>
        updates.has(c.kind) ? { ...c, ...updates.get(c.kind)! } : c,
      ),
    );
  }

  function toggle(kind: SectionKind) {
    onConfigChange(
      config.map((c) => (c.kind === kind ? { ...c, enabled: !c.enabled } : c)),
    );
  }

  const renderCard = (s: SectionOutput) => (
    <div key={s.kind} id={`section-${s.kind}`} className="scroll-mt-24">
      {s.enabled ? (
        <SectionCard
          section={s}
          collapsed={collapsed.has(s.kind)}
          onToggleCollapse={() => toggleCollapse(s.kind)}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-muted/60 px-6 py-3 text-sm text-ink-tertiary">
          {s.title} — excluded from preview and export
        </div>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* LEFT — section nav / control with appendix lane (dark panel) */}
      <aside className="lg:sticky lg:top-24 lg:h-fit lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto rounded-2xl border border-ink bg-ink p-4 text-surface shadow-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Sections</h2>
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={expandAll}
              className="inline-flex items-center gap-1 rounded-md border border-surface/20 px-2 py-1 text-surface/80 hover:bg-white/10"
            >
              <ChevronsIcon dir="down" />
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="inline-flex items-center gap-1 rounded-md border border-surface/20 px-2 py-1 text-surface/80 hover:bg-white/10"
            >
              <ChevronsIcon dir="up" />
              Collapse
            </button>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={navIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {main.map((s) => (
                <SortableNavItem
                  key={s.kind}
                  section={s}
                  onToggle={() => toggle(s.kind)}
                  onJump={() => jumpTo(s.kind)}
                />
              ))}
              <AppendixDivider count={appendix.length} />
              {appendix.map((s) => (
                <SortableNavItem
                  key={s.kind}
                  section={s}
                  onToggle={() => toggle(s.kind)}
                  onJump={() => jumpTo(s.kind)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <p className="mt-3 px-1 text-[10px] leading-snug text-surface/50">
          Drag a section below the divider to move it into the appendix. Conservative
          &amp; upside scenario slides are appended automatically.
        </p>
      </aside>

      {/* RIGHT — section work / edit area (main, then the appendix lane) */}
      <div className="space-y-4">
        {main.map(renderCard)}
        <div className="flex items-center gap-3 pt-2">
          <span className="h-px flex-1 bg-line-strong" />
          <span className="rounded-full border border-line-strong bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
            Appendix
          </span>
          <span className="h-px flex-1 bg-line-strong" />
        </div>
        {appendix.length > 0 ? (
          appendix.map(renderCard)
        ) : (
          <p className="text-center text-xs text-ink-tertiary">
            No appendix sections — drag one below the divider in the section list.
          </p>
        )}
      </div>
    </div>
  );
}

/** The draggable appendix divider — main-deck sections above it, appendix below. */
function AppendixDivider({ count }: { count: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: DIVIDER_ID });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="my-1.5 flex cursor-grab items-center gap-2 rounded-md border border-dashed border-accent-bright/50 bg-accent-bright/15 px-2 py-1 active:cursor-grabbing"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-accent-bright">
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="11" cy="3" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="13" r="1.5" />
        <circle cx="11" cy="13" r="1.5" />
      </svg>
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-accent-bright">
        Appendix divider
      </span>
      <span className="text-[10px] text-surface/50">{count}</span>
    </li>
  );
}

/** Double-chevron icon for the Expand (down) / Collapse (up) buttons. */
function ChevronsIcon({ dir }: { dir: "up" | "down" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {dir === "down" ? (
        <path d="M4 4l4 4 4-4M4 9l4 4 4-4" />
      ) : (
        <path d="M4 12l4-4 4 4M4 7l4-4 4 4" />
      )}
    </svg>
  );
}

function SortableNavItem({
  section,
  onToggle,
  onJump,
}: {
  section: SectionOutput;
  onToggle: () => void;
  onJump: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.kind });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${
        section.enabled
          ? "border-surface/15 bg-white/5"
          : "border-dashed border-surface/15 bg-transparent"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        title="Drag to reorder / move to appendix"
        className="cursor-grab rounded p-0.5 text-surface/40 hover:bg-white/10 active:cursor-grabbing"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <input
        type="checkbox"
        checked={section.enabled}
        onChange={onToggle}
        title={section.enabled ? "Exclude from proposal" : "Include in proposal"}
        className="accent-[var(--accent-bright)]"
      />
      <button
        onClick={onJump}
        className={`flex-1 truncate text-left text-xs ${
          section.enabled ? "text-surface hover:text-accent-bright" : "text-surface/40"
        }`}
        title={section.title}
      >
        {section.title.split("—")[0].trim()}
      </button>
    </li>
  );
}
