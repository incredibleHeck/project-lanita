import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Request } from 'express';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async captureOldValues(
    request: Request,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const modelMap: Record<string, string> = {
      User: 'user',
      StudentRecord: 'studentRecord',
      Result: 'result',
      AttendanceRecord: 'attendanceRecord',
      Class: 'class',
      Section: 'section',
      Subject: 'subject',
      Exam: 'exam',
      FeeStructure: 'feeStructure',
      StudentInvoice: 'studentInvoice',
      Payment: 'payment',
    };
    const modelName = modelMap[entityType] ?? entityType.toLowerCase();
    const model = (this.prisma as any)[modelName];
    if (!model) {
      request['auditOldValues'] = null;
      request['auditMetadata'] = { entityType, entityId };
      return;
    }
    try {
      const oldRecord = await model.findUnique({
        where: { id: entityId },
      });
      request['auditOldValues'] = oldRecord
        ? JSON.parse(JSON.stringify(oldRecord))
        : null;
    } catch {
      request['auditOldValues'] = null;
    }
    request['auditMetadata'] = { entityType, entityId };
  }
}
