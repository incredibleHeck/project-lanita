'use client';

import { useDraggable } from '@dnd-kit/core';

interface DraggableSlotProps {
  id: string;
  slot: {
    id?: string;
    section_id?: string;
    sectionId?: string;
    subject_id?: string;
    subjectId?: string;
    teacher_id?: string;
    teacherId?: string;
    [key: string]: unknown;
  };
  getPrimaryLabel: (slot: any) => string;
  getSecondaryLabel: (slot: any) => string;
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
      className={`rounded p-2 text-sm cursor-grab active:cursor-grabbing touch-none border-l-4 ${
        isDragging ? 'opacity-50' : ''
      } ${disabled ? 'cursor-default' : ''}`}
      style={
        color
          ? {
              borderLeftColor: color,
              backgroundColor: `${color}15`,
            }
          : { borderLeftColor: 'transparent', backgroundColor: 'hsl(var(--primary) / 0.1)' }
      }
    >
      <div className="font-medium">{getPrimaryLabel(slot)}</div>
      <div className="text-xs text-muted-foreground">{getSecondaryLabel(slot)}</div>
    </div>
  );
}
