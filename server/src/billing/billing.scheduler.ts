import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 9 * * 1')
  async sendWeeklyFeeReminders() {
    this.logger.log('Running weekly fee reminder job');

    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const upcomingDue = await this.prisma.studentInvoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: {
          gte: new Date(),
          lte: oneWeekFromNow,
        },
      },
      include: {
        student: {
          include: {
            parent: { include: { profile: true } },
            user: { include: { profile: true } },
          },
        },
        term: true,
      },
    });

    for (const invoice of upcomingDue) {
      if (invoice.student.parent) {
        try {
          const totalAmount = Number(invoice.totalAmount);
          const amountPaid = Number(invoice.amountPaid);
          const balance = totalAmount - amountPaid;

          await this.notificationService.sendFeeReminder(
            invoice.student.parent.id,
            `${invoice.student.user.profile?.firstName || ''} ${invoice.student.user.profile?.lastName || ''}`.trim(),
            totalAmount,
            invoice.term.name,
            invoice.dueDate.toISOString().split('T')[0],
            balance,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to send fee reminder for invoice ${invoice.id}: ${err}`,
          );
        }
      }
    }

    this.logger.log(`Sent ${upcomingDue.length} fee reminders`);
  }

  @Cron('0 9 * * *')
  async sendOverdueNotifications() {
    this.logger.log('Running overdue fee notification job');

    const overdue = await this.prisma.studentInvoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      include: {
        student: {
          include: {
            parent: { include: { profile: true } },
            user: { include: { profile: true } },
          },
        },
      },
    });

    for (const invoice of overdue) {
      if (invoice.student.parent) {
        try {
          const totalAmount = Number(invoice.totalAmount);
          const amountPaid = Number(invoice.amountPaid);
          const balance = totalAmount - amountPaid;

          await this.notificationService.sendFeeOverdue(
            invoice.student.parent.id,
            `${invoice.student.user.profile?.firstName || ''} ${invoice.student.user.profile?.lastName || ''}`.trim(),
            balance,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to send overdue notification for invoice ${invoice.id}: ${err}`,
          );
        }
      }
    }

    this.logger.log(`Sent ${overdue.length} overdue notifications`);
  }
}
