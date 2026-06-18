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

/**
 * The Build screen body — FLIPPED layout: the section list / nav lives on the
 * LEFT (drag to reorder, toggle to include/exclude, click to jump), the section
 * work / edit area (the cards) on the RIGHT. Reordering rewrites the shared
 * sectionConfig so web preview and pptx export stay in lockstep.
 */
export default function SectionList({ sections, config, onConfigChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const ids = sections.map((s) => s.kind);

  const [collapsed, setCollapsed] = useState<Set<SectionKind>>(new Set());
  const collapseAll = () => setCollapsed(new Set(ids));
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

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id as SectionKind);
    const newIndex = ids.indexOf(over.id as SectionKind);
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onConfigChange(config.map((c) => ({ ...c, order: newOrder.indexOf(c.kind) })));
  }

  function toggle(kind: SectionKind) {
    onConfigChange(
      config.map((c) => (c.kind === kind ? { ...c, enabled: !c.enabled } : c)),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* LEFT — section nav / control */}
      <aside className="lg:sticky lg:top-20 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto rounded-xl border border-line bg-surface p-3 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sections</h2>
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={expandAll}
              className="rounded border border-line px-1.5 py-0.5 text-ink-secondary hover:bg-muted"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="rounded border border-line px-1.5 py-0.5 text-ink-secondary hover:bg-muted"
            >
              Collapse
            </button>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {sections.map((s) => (
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
      </aside>

      {/* RIGHT — section work / edit area */}
      <div className="space-y-4">
        {sections.map((s) => (
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
        ))}
      </div>
    </div>
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
      className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 ${
        section.enabled
          ? "border-line bg-surface"
          : "border-dashed border-line bg-muted/50"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="cursor-grab rounded p-0.5 text-ink-tertiary hover:bg-muted active:cursor-grabbing"
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
        className="accent-[var(--accent)]"
      />
      <button
        onClick={onJump}
        className={`flex-1 truncate text-left text-xs ${
          section.enabled ? "hover:text-accent" : "text-ink-tertiary"
        }`}
        title={section.title}
      >
        {section.title.split("—")[0].trim()}
      </button>
    </li>
  );
}
