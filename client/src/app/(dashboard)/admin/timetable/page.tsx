'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  RefreshCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Building2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/axios';

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface TimetableSlot {
  section_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string | null;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
}

interface GenerateResponse {
  status: string;
  slots: TimetableSlot[];
  conflictsResolved: number;
  optimizationScore: number;
  message: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  type: string;
  building?: string;
  floor?: number;
}

interface Section {
  id: string;
  name: string;
  class: { id: string; name: string };
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_ABBREVIATIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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

export default function TimetablePage() {
  const queryClient = useQueryClient();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [generatedSlots, setGeneratedSlots] = useState<TimetableSlot[]>([]);
  const [generateStatus, setGenerateStatus] = useState<string>('');
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 30, type: 'CLASSROOM' });

  const { data: academicYears } = useQuery<AcademicYear[]>({
    queryKey: ['academicYears'],
    queryFn: async () => {
      const response = await api.get('/academic-year');
      const currentYear = response.data.find((y: AcademicYear) => y.isCurrent);
      if (currentYear && !selectedAcademicYear) {
        setSelectedAcademicYear(currentYear.id);
      }
      return response.data;
    },
  });

  const { data: sections } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: async () => {
      const response = await api.get('/sections');
      return response.data;
    },
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await api.get('/subjects');
      return response.data;
    },
  });

  const { data: rooms, refetch: refetchRooms } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await api.get('/timetable/rooms');
      return response.data;
    },
  });

  const { data: savedSlots, refetch: refetchSavedSlots } = useQuery({
    queryKey: ['timetableSlots', selectedAcademicYear],
    queryFn: async () => {
      if (!selectedAcademicYear) return [];
      const response = await api.get(`/timetable?academicYearId=${selectedAcademicYear}`);
      return response.data;
    },
    enabled: !!selectedAcademicYear,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<GenerateResponse>('/timetable/generate', {
        academicYearId: selectedAcademicYear,
        periodsPerDay: 8,
        daysPerWeek: 5,
        timeoutSeconds: 60,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedSlots(data.slots);
      setGenerateStatus(data.status);
    },
    onError: (error: any) => {
      setGenerateStatus('ERROR');
      console.error('Generation failed:', error);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/timetable/save?academicYearId=${selectedAcademicYear}`, {
        slots: generatedSlots,
      });
    },
    onSuccess: () => {
      refetchSavedSlots();
      setGeneratedSlots([]);
      setGenerateStatus('SAVED');
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      await api.post('/timetable/rooms', newRoom);
    },
    onSuccess: () => {
      refetchRooms();
      setRoomDialogOpen(false);
      setNewRoom({ name: '', capacity: 30, type: 'CLASSROOM' });
    },
  });

  const sectionMap = new Map(sections?.map((s) => [s.id, s]) || []);
  const subjectMap = new Map(subjects?.map((s) => [s.id, s]) || []);
  const roomMap = new Map(rooms?.map((r) => [r.id, r]) || []);

  const displaySlots = generatedSlots.length > 0 ? generatedSlots : (savedSlots || []);

  const filteredSlots = selectedSection === 'all'
    ? displaySlots
    : displaySlots.filter((slot: any) =>
        slot.section_id === selectedSection || slot.sectionId === selectedSection
      );

  const getSlotForCell = (day: number, period: number, sectionId: string) => {
    return filteredSlots.find((slot: any) => {
      const slotDay = slot.day_of_week ?? slot.dayOfWeek;
      const slotPeriod = slot.period_number ?? slot.periodNumber;
      const slotSectionId = slot.section_id ?? slot.sectionId;
      return slotDay === day && slotPeriod === period && slotSectionId === sectionId;
    });
  };

  const getSubjectName = (slot: any) => {
    const subjectId = slot.subject_id ?? slot.subjectId;
    const subject = subjectMap.get(subjectId);
    return subject?.name || slot.subject?.name || 'Unknown';
  };

  const getRoomName = (slot: any) => {
    const roomId = slot.room_id ?? slot.roomId;
    if (!roomId) return 'TBD';
    const room = roomMap.get(roomId);
    return room?.name || slot.room?.name || 'TBD';
  };

  const selectedSectionObj = sectionMap.get(selectedSection);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Timetable Generator</h1>
            <p className="text-sm text-muted-foreground">
              Auto-generate optimized class schedules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears?.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.name} {year.isCurrent && '(Current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedAcademicYear || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>

          {generatedSlots.length > 0 && (
            <Button
              variant="default"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Timetable
            </Button>
          )}
        </div>
      </div>

      {generateStatus && (
        <Card className={
          generateStatus === 'OPTIMAL' ? 'border-green-500 bg-green-50' :
          generateStatus === 'FEASIBLE' ? 'border-yellow-500 bg-yellow-50' :
          generateStatus === 'SAVED' ? 'border-blue-500 bg-blue-50' :
          'border-red-500 bg-red-50'
        }>
          <CardContent className="flex items-center gap-3 py-4">
            {generateStatus === 'OPTIMAL' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700">
                  Optimal timetable generated with {generatedSlots.length} slots!
                </span>
              </>
            )}
            {generateStatus === 'FEASIBLE' && (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700">
                  Feasible solution found. May not be fully optimal.
                </span>
              </>
            )}
            {generateStatus === 'SAVED' && (
              <>
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700">Timetable saved successfully!</span>
              </>
            )}
            {generateStatus === 'ERROR' && (
              <>
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">
                  Failed to generate timetable. Check allocations and try again.
                </span>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displaySlots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
            <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      placeholder="e.g., Room 101"
                    />
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={newRoom.capacity}
                      onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newRoom.type}
                      onValueChange={(v) => setNewRoom({ ...newRoom, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLASSROOM">Classroom</SelectItem>
                        <SelectItem value="LAB">Lab</SelectItem>
                        <SelectItem value="HALL">Hall</SelectItem>
                        <SelectItem value="LIBRARY">Library</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createRoomMutation.mutate()}
                    disabled={!newRoom.name || createRoomMutation.isPending}
                  >
                    {createRoomMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Building2 className="mr-2 h-4 w-4" />
                    )}
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timetable Grid
              </CardTitle>
              <CardDescription>
                {generatedSlots.length > 0 ? 'Preview - click Save to persist' : 'Saved schedule'}
              </CardDescription>
            </div>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections?.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.class.name} - {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSection !== 'all' && selectedSectionObj ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Period</TableHead>
                    {DAYS.map((day, i) => (
                      <TableHead key={i} className="text-center min-w-[150px]">
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
                        const slot = getSlotForCell(dayIndex, period.number, selectedSection);
                        return (
                          <TableCell key={dayIndex} className="text-center p-2">
                            {slot ? (
                              <div className="bg-primary/10 rounded p-2 text-sm">
                                <div className="font-medium">{getSubjectName(slot)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {getRoomName(slot)}
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
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a section to view its timetable</p>
            </div>
          )}
        </CardContent>
      </Card>

      {rooms && rooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="font-medium">{room.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{room.type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Cap: {room.capacity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
