"use client";

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
        <div className="space-y-4">
          {sections.map((s) => (
            <SortableSection key={s.kind} section={s} onToggle={() => toggle(s.kind)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableSection({
  section,
  onToggle,
}: {
  section: SectionOutput;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.kind });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
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
        <SectionCard section={section} />
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-muted/60 px-6 py-3 text-sm text-ink-tertiary">
          {section.title} — excluded from preview and export
        </div>
      )}
    </div>
  );
}
