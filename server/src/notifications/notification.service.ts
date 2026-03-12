import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  async sendAttendanceAlert(
    schoolId: string,
    parentId: string,
    studentName: string,
    status: AttendanceStatus,
    date: string,
    options?: { phone?: string; parentFirstName?: string },
  ) {
    if (!schoolId) {
      this.logger.warn(
        'Cannot enqueue attendance alert: schoolId is required for tenant isolation',
      );
      return;
    }
    let phone = options?.phone;
    let parentFirstName = options?.parentFirstName;

    if (!phone || parentFirstName === undefined) {
      const parent = await this.prisma.user.findUnique({
        where: { id: parentId },
        include: { profile: true },
      });

      if (!parent?.profile?.contactNumber) {
        this.logger.debug(`Parent ${parentId} has no contact number - skipping`);
        return;
      }
      phone = parent.profile.contactNumber;
      parentFirstName = parent.profile.firstName ?? '';
    }

    await this.notificationQueue.add('send-whatsapp', {
      schoolId,
      recipientId: parentId,
      recipientType: 'PARENT' as const,
      phone: phone!,
      templateName: 'attendance_alert',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: parentFirstName ?? '' },
            { type: 'text', text: studentName },
            { type: 'text', text: status.toLowerCase() },
            { type: 'text', text: date },
          ],
        },
      ],
    });
  }

  async sendFeeReminder(
    schoolId: string,
    parentId: string,
    studentName: string,
    amount: number,
    term: string,
    dueDate: string,
    balance: number,
  ) {
    if (!schoolId) {
      this.logger.warn(
        'Cannot enqueue fee reminder: schoolId is required for tenant isolation',
      );
      return;
    }
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
      schoolId,
      recipientId: parentId,
      recipientType: 'PARENT' as const,
      phone: parent.profile.contactNumber,
      templateName: 'fee_reminder',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: parent.profile.firstName },
            { type: 'text', text: studentName },
            { type: 'text', text: amount.toString() },
            { type: 'text', text: term },
            { type: 'text', text: dueDate },
            { type: 'text', text: balance.toString() },
          ],
        },
      ],
    });
  }

  async sendFeeOverdue(
    schoolId: string,
    parentId: string,
    studentName: string,
    amount: number,
  ) {
    if (!schoolId) {
      this.logger.warn(
        'Cannot enqueue fee overdue: schoolId is required for tenant isolation',
      );
      return;
    }
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
      schoolId,
      recipientId: parentId,
      recipientType: 'PARENT' as const,
      phone: parent.profile.contactNumber,
      templateName: 'fee_overdue',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: parent.profile.firstName },
            { type: 'text', text: studentName },
            { type: 'text', text: amount.toString() },
          ],
        },
      ],
    });
  }

  async sendReportReadyNotification(
    schoolId: string,
    parentId: string,
    studentName: string,
    term: string,
    portalUrl: string,
  ) {
    if (!schoolId) {
      this.logger.warn(
        'Cannot enqueue report ready notification: schoolId is required for tenant isolation',
      );
      return;
    }
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
      schoolId,
      recipientId: parentId,
      recipientType: 'PARENT' as const,
      phone: parent.profile.contactNumber,
      templateName: 'report_ready',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: parent.profile.firstName },
            { type: 'text', text: studentName },
            { type: 'text', text: term },
            { type: 'text', text: portalUrl },
          ],
        },
      ],
    });
  }

  async sendAnnouncement(
    schoolId: string,
    recipientId: string,
    schoolName: string,
    content: string,
  ) {
    if (!schoolId) {
      this.logger.warn(
        'Cannot enqueue announcement: schoolId is required for tenant isolation',
      );
      return;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });

    if (!user?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
      schoolId,
      recipientId,
      recipientType: 'PARENT' as const,
      phone: user.profile.contactNumber,
      templateName: 'announcement',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: schoolName },
            { type: 'text', text: content },
          ],
        },
      ],
    });
  }
}
