'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

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
      className={cn(
        'rounded-md min-h-[60px] transition-all duration-200',
        isOver
          ? 'border-2 border-solid border-primary bg-primary/5'
          : 'border border-dashed border-border/50',
        className ?? ''
      )}
    >
      {children}
    </div>
  );
}
