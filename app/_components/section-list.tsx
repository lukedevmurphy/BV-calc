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
  /** All computed sections, sorted by order (disabled ones included — they
   *  stay computed so the exec summary keeps its figures). */
  sections: SectionOutput[];
  config: SectionConfigEntry[];
  onConfigChange: (config: SectionConfigEntry[]) => void;
}

/** Drag-to-reorder + enable/disable. Order changes rewrite the shared
 *  sectionConfig, so web preview and pptx export stay in lockstep. */
export default function SectionList({ sections, config, onConfigChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const ids = sections.map((s) => s.kind);

  // Per-card collapse is pure preview state — it never touches sectionConfig,
  // so it can't affect the pptx export or a saved proposal.
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

  // Jump-nav: expand the target (if collapsed) and scroll it into view, so a
  // viewer can land on Business Value / Cost / Forecast without scrolling.
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
    onConfigChange(
      config.map((c) => ({ ...c, order: newOrder.indexOf(c.kind) })),
    );
  }

  function toggle(kind: SectionKind) {
    onConfigChange(
      config.map((c) => (c.kind === kind ? { ...c, enabled: !c.enabled } : c)),
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="sticky top-0 z-20 mb-3 space-y-2 rounded-lg border border-line bg-canvas/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-ink-tertiary">Jump to:</span>
            {sections
              .filter((s) => s.enabled)
              .map((s) => (
                <button
                  key={s.kind}
                  onClick={() => jumpTo(s.kind)}
                  className="rounded-md border border-line px-2 py-0.5 text-ink-secondary hover:border-line-strong hover:bg-muted"
                >
                  {s.title.split("—")[0].trim()}
                </button>
              ))}
            <span className="ml-auto flex gap-2">
              <button
                onClick={expandAll}
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-secondary hover:bg-muted"
              >
                Expand all
              </button>
              <button
                onClick={collapseAll}
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-secondary hover:bg-muted"
              >
                Collapse all
              </button>
            </span>
          </div>
        </div>
        <div className="space-y-4">
          {sections.map((s) => (
            <SortableSection
              key={s.kind}
              section={s}
              collapsed={collapsed.has(s.kind)}
              onToggle={() => toggle(s.kind)}
              onToggleCollapse={() => toggleCollapse(s.kind)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableSection({
  section,
  collapsed,
  onToggle,
  onToggleCollapse,
}: {
  section: SectionOutput;
  collapsed: boolean;
  onToggle: () => void;
  onToggleCollapse: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.kind });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      id={`section-${section.kind}`}
      style={style}
      className="relative scroll-mt-20"
    >
      <div className="absolute -left-1 top-3 z-10 flex -translate-x-full flex-col items-center gap-1 pr-2">
        <button
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="cursor-grab rounded p-1 text-ink-tertiary hover:bg-muted active:cursor-grabbing"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
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
      </div>

      {section.enabled ? (
        <SectionCard
          section={section}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-muted/60 px-6 py-3 text-sm text-ink-tertiary">
          {section.title} — excluded from preview and export
        </div>
      )}
    </div>
  );
}
