'use client';

import { forwardRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const PERIODS = [
  { number: 1, start: '08:00', end: '08:45' },
  { number: 2, start: '08:50', end: '09:35' },
  { number: 3, start: '09:40', end: '10:25' },
  { number: 4, start: '10:40', end: '11:25' },
  { number: 5, start: '11:30', end: '12:15' },
  { number: 6, start: '13:00', end: '13:45' },
  { number: 7, start: '13:50', end: '14:35' },
  { number: 8, start: '14:40', end: '15:25' },
];

interface Slot {
  section_id?: string;
  sectionId?: string;
  teacher_id?: string;
  teacherId?: string;
  day_of_week?: number;
  dayOfWeek?: number;
  period_number?: number;
  periodNumber?: number;
  subject?: { name: string };
  room?: { name: string };
  [key: string]: unknown;
}

interface TimetablePrintViewProps {
  slots: Slot[];
  viewMode: 'SECTION' | 'TEACHER';
  entityId: string;
  entityName: string;
  getSlotForCell: (day: number, period: number, entityId: string) => Slot | undefined;
  getSubjectName: (slot: Slot) => string;
  getSecondaryLabel: (slot: Slot) => string;
}

export const TimetablePrintView = forwardRef<HTMLDivElement, TimetablePrintViewProps>(
  (
    {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- slots required by interface; print view uses getSlotForCell
      slots,
      viewMode,
      entityId,
      entityName,
      getSlotForCell,
      getSubjectName,
      getSecondaryLabel,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="bg-white p-6 print:p-4">
        <h1 className="text-xl font-bold mb-4 print:text-lg">
          Timetable - {viewMode === 'SECTION' ? 'Section' : 'Teacher'}: {entityName}
        </h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Period</TableHead>
              {DAYS.map((day, i) => (
                <TableHead key={i} className="text-center min-w-[120px]">
                  {day}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERIODS.map((period) => (
              <TableRow key={period.number}>
                <TableCell className="font-medium">
                  <div className="text-sm">{period.number}</div>
                  <div className="text-xs text-muted-foreground">
                    {period.start}-{period.end}
                  </div>
                </TableCell>
                {DAYS.map((_, dayIndex) => {
                  const slot = getSlotForCell(dayIndex, period.number, entityId);
                  return (
                    <TableCell key={dayIndex} className="text-center p-2">
                      {slot ? (
                        <div className="rounded p-2 text-sm border">
                          <div className="font-medium">{getSubjectName(slot)}</div>
                          <div className="text-xs text-muted-foreground">
                            {getSecondaryLabel(slot)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-xs">-</div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
);

TimetablePrintView.displayName = 'TimetablePrintView';
