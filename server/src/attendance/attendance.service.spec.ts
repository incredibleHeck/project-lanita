import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

const mockPrisma = {
  subjectAllocation: { findUnique: jest.fn() },
  attendanceRecord: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

const mockNotificationService = {
  sendAttendanceAlert: jest.fn(),
};

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = mockPrisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markRegister', () => {
    it('should throw NotFoundException when allocation not found', async () => {
      prisma.subjectAllocation.findUnique.mockResolvedValue(null);

      await expect(
        service.markRegister({
          subjectAllocationId: 'invalid-id',
          date: '2025-03-07',
          records: [{ studentId: 'stu-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark attendance for valid allocation', async () => {
      prisma.subjectAllocation.findUnique.mockResolvedValue({
        id: 'alloc-1',
        sectionId: 'sec-1',
        subjectId: 'sub-1',
        teacherId: 'teacher-1',
      });
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      prisma.attendanceRecord.upsert.mockResolvedValue({
        id: 'att-1',
        studentId: 'stu-1',
        status: 'PRESENT',
      });

      const result = await service.markRegister({
        subjectAllocationId: 'alloc-1',
        date: '2025-03-07',
        records: [{ studentId: 'stu-1', status: 'PRESENT' }],
      });

      expect(result).toHaveProperty('updated');
      expect(result.updated).toBeGreaterThanOrEqual(0);
      expect(prisma.attendanceRecord.findMany).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
    });
  });
});
