'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableCellProps {
  id: string;
  day: number;
  period: number;
  children: React.ReactNode;
  className?: string;
}

export function DroppableCell({ id, day, period, children, className }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { day, period },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {children}
    </div>
  );
}
