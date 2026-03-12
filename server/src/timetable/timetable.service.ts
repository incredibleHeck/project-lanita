import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { RoomType } from '@prisma/client';

export interface TimetableSlotResult {
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
  slots: TimetableSlotResult[];
  conflicts_resolved: number;
  optimization_score: number;
  message: string;
}

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  async generateTimetable(dto: GenerateTimetableDto) {
    const mlServiceUrl = this.config.get<string>('ML_SERVICE_URL');
    if (!mlServiceUrl) {
      throw new BadRequestException('ML_SERVICE_URL not configured');
    }

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const [sections, subjects, teachers, rooms, allocations] =
      await Promise.all([
        this.prisma.section.findMany({
          include: { class: true },
        }),
        this.prisma.subject.findMany(),
        this.prisma.user.findMany({
          where: { role: 'TEACHER', isActive: true },
          include: { profile: true },
        }),
        this.prisma.room.findMany(),
        this.prisma.subjectAllocation.findMany({
          where: { academicYearId: dto.academicYearId },
        }),
      ]);

    if (allocations.length === 0) {
      throw new BadRequestException(
        'No subject allocations found for this academic year',
      );
    }

    const requestBody = {
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name,
        class_name: s.class.name,
        capacity: s.capacity,
      })),
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        periods_per_week: s.periodsPerWeek,
        requires_lab: s.requiresLab,
        is_double_period: false,
      })),
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.profile
          ? `${t.profile.firstName} ${t.profile.lastName}`
          : t.email,
        max_periods_per_day: 6,
        unavailable_slots: [],
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        type: r.type,
      })),
      allocations: allocations.map((a) => ({
        section_id: a.sectionId,
        subject_id: a.subjectId,
        teacher_id: a.teacherId,
      })),
      periods_per_day: dto.periodsPerDay || 8,
      days_per_week: dto.daysPerWeek || 5,
      academic_year_id: dto.academicYearId,
      timeout_seconds: dto.timeoutSeconds || 60,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<GenerateResponse>(
          `${mlServiceUrl}/timetable/generate`,
          requestBody,
        ),
      );

      return {
        status: response.data.status,
        slots: response.data.slots,
        conflictsResolved: response.data.conflicts_resolved,
        optimizationScore: response.data.optimization_score,
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`Timetable generation failed: ${error}`);
      throw new BadRequestException(
        `Failed to generate timetable: ${error.response?.data?.detail || error.message}`,
      );
    }
  }

  async saveTimetable(academicYearId: string, slots: TimetableSlotResult[]) {
    await this.prisma.timetableSlot.deleteMany({
      where: { academicYearId },
    });

    const createData = slots.map((slot) => ({
      dayOfWeek: slot.day_of_week,
      periodNumber: slot.period_number,
      startTime: slot.start_time,
      endTime: slot.end_time,
      sectionId: slot.section_id,
      subjectId: slot.subject_id,
      teacherId: slot.teacher_id,
      roomId: slot.room_id,
      academicYearId,
    }));

    await this.prisma.timetableSlot.createMany({
      data: createData,
    });

    return { saved: createData.length };
  }

  async getTimetableBySection(sectionId: string, academicYearId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { sectionId, academicYearId },
      include: {
        subject: true,
        teacher: { include: { profile: true } },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async getTimetableByTeacher(teacherId: string, academicYearId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { teacherId, academicYearId },
      include: {
        subject: true,
        section: { include: { class: true } },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async updateSlot(id: string, dto: UpdateSlotDto) {
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!slot) {
      throw new NotFoundException('Timetable slot not found');
    }

    const newDay = dto.dayOfWeek ?? slot.dayOfWeek;
    const newPeriod = dto.periodNumber ?? slot.periodNumber;

    if (newDay === slot.dayOfWeek && newPeriod === slot.periodNumber) {
      return slot;
    }

    const existingAtTarget = await this.prisma.timetableSlot.findFirst({
      where: {
        academicYearId: slot.academicYearId,
        dayOfWeek: newDay,
        periodNumber: newPeriod,
        id: { not: id },
      },
    });

    if (existingAtTarget) {
      if (existingAtTarget.sectionId === slot.sectionId) {
        throw new ConflictException('Section already has a class at this time');
      }
      if (existingAtTarget.teacherId === slot.teacherId) {
        throw new ConflictException('Teacher already has a class at this time');
      }
      if (slot.roomId && existingAtTarget.roomId === slot.roomId) {
        throw new ConflictException('Room already in use at this time');
      }
    }

    const periodTimes: Record<number, { start: string; end: string }> = {
      1: { start: '08:00', end: '08:45' },
      2: { start: '08:50', end: '09:35' },
      3: { start: '09:40', end: '10:25' },
      4: { start: '10:40', end: '11:25' },
      5: { start: '11:30', end: '12:15' },
      6: { start: '13:00', end: '13:45' },
      7: { start: '13:50', end: '14:35' },
      8: { start: '14:40', end: '15:25' },
    };
    const times = periodTimes[newPeriod] ?? {
      start: slot.startTime,
      end: slot.endTime,
    };

    return this.prisma.timetableSlot.update({
      where: { id },
      data: {
        dayOfWeek: newDay,
        periodNumber: newPeriod,
        startTime: times.start,
        endTime: times.end,
      },
      include: {
        subject: true,
        section: { include: { class: true } },
        teacher: { include: { profile: true } },
        room: true,
      },
    });
  }

  async getAllTimetableSlots(academicYearId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { academicYearId },
      include: {
        subject: true,
        section: { include: { class: true } },
        teacher: { include: { profile: true } },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async createRoom(data: {
    name: string;
    capacity: number;
    type: RoomType;
    building?: string;
    floor?: number;
  }) {
    return this.prisma.room.create({ data });
  }

  async getRooms() {
    return this.prisma.room.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateRoom(
    id: string,
    data: Partial<{
      name: string;
      capacity: number;
      type: RoomType;
      building: string;
      floor: number;
    }>,
  ) {
    return this.prisma.room.update({
      where: { id },
      data,
    });
  }

  async deleteRoom(id: string) {
    return this.prisma.room.delete({
      where: { id },
    });
  }
}
