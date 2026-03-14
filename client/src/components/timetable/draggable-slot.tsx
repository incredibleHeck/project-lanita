'use client';

import { GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface SlotData {
  id?: string;
  section_id?: string;
  sectionId?: string;
  subject_id?: string;
  subjectId?: string;
  teacher_id?: string;
  teacherId?: string;
  [key: string]: unknown;
}

interface DraggableSlotProps {
  id: string;
  slot: SlotData;
  getPrimaryLabel: (slot: SlotData) => string;
  getSecondaryLabel: (slot: SlotData) => string;
  color?: string;
  disabled?: boolean;
}

export function DraggableSlot({
  id,
  slot,
  getPrimaryLabel,
  getSecondaryLabel,
  color,
  disabled,
}: DraggableSlotProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { slot },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-md p-2 text-sm cursor-grab active:cursor-grabbing touch-none border-l-4 border border-border/60 shadow-sm transition-shadow duration-200 ${
        isDragging ? 'opacity-50' : ''
      } ${disabled ? 'cursor-default' : ''}`}
      style={
        color
          ? {
              borderLeftColor: color,
              backgroundColor: `${color}20`,
            }
          : { borderLeftColor: 'transparent', backgroundColor: 'hsl(var(--primary) / 0.1)' }
      }
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/70 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium" style={color ? { color } : undefined}>
            {getPrimaryLabel(slot)}
          </div>
          <div className="text-xs text-muted-foreground">{getSecondaryLabel(slot)}</div>
        </div>
      </div>
    </div>
  );
}
