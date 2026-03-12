import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateThread(
    teacherId: string,
    parentId: string,
    studentId: string,
  ) {
    return this.prisma.messageThread.upsert({
      where: {
        participantA_participantB_studentId: {
          participantA: teacherId,
          participantB: parentId,
          studentId,
        },
      },
      create: {
        participantA: teacherId,
        participantB: parentId,
        studentId,
      },
      update: {},
      include: {
        messages: { take: 50, orderBy: { createdAt: 'desc' } },
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
        student: { include: { user: { include: { profile: true } } } },
      },
    });
  }

  async sendMessage(threadId: string, senderId: string, content: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.participantA !== senderId && thread.participantB !== senderId) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const message = await this.prisma.message.create({
      data: { threadId, senderId, content },
      include: { sender: { include: { profile: true } } },
    });

    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async getThreadMessages(threadId: string, userId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { include: { profile: true } } },
        },
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
        student: { include: { user: { include: { profile: true } } } },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    if (thread.participantA !== userId && thread.participantB !== userId) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    return thread;
  }

  async getThreadsForUser(userId: string) {
    return this.prisma.messageThread.findMany({
      where: {
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
        student: { include: { user: { include: { profile: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }
}
