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
    parentId: string,
    studentName: string,
    status: AttendanceStatus,
    date: string,
  ) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) {
      this.logger.debug(`Parent ${parentId} has no contact number - skipping`);
      return;
    }

    await this.notificationQueue.add('send-whatsapp', {
      recipientId: parentId,
      recipientType: 'PARENT' as const,
      phone: parent.profile.contactNumber,
      templateName: 'attendance_alert',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: parent.profile.firstName },
            { type: 'text', text: studentName },
            { type: 'text', text: status.toLowerCase() },
            { type: 'text', text: date },
          ],
        },
      ],
    });
  }

  async sendFeeReminder(
    parentId: string,
    studentName: string,
    amount: number,
    term: string,
    dueDate: string,
    balance: number,
  ) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
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
    parentId: string,
    studentName: string,
    amount: number,
  ) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
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
    parentId: string,
    studentName: string,
    term: string,
    portalUrl: string,
  ) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { profile: true },
    });

    if (!parent?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
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

  async sendAnnouncement(recipientId: string, schoolName: string, content: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });

    if (!user?.profile?.contactNumber) return;

    await this.notificationQueue.add('send-whatsapp', {
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
