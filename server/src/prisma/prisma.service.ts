import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { tenantExtension } from './prisma-tenant.extension';

export type ExtendedPrismaClient = PrismaClient &
  ReturnType<typeof tenantExtension>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private _client: ExtendedPrismaClient;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(this.pool);
    const base = new PrismaClient({ adapter });
    this._client = base.$extends(tenantExtension) as ExtendedPrismaClient;
  }

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
    await this.pool.end();
  }

  get $connect() {
    return this._client.$connect.bind(this._client);
  }
  get $disconnect() {
    return this._client.$disconnect.bind(this._client);
  }
  get $transaction() {
    return this._client.$transaction.bind(this._client);
  }
  get $queryRaw() {
    return this._client.$queryRaw.bind(this._client);
  }
  get $executeRaw() {
    return this._client.$executeRaw.bind(this._client);
  }
  get $queryRawUnsafe() {
    return this._client.$queryRawUnsafe.bind(this._client);
  }
  get $executeRawUnsafe() {
    return this._client.$executeRawUnsafe.bind(this._client);
  }
  get user() {
    return this._client.user;
  }
  get school() {
    return this._client.school;
  }
  get profile() {
    return this._client.profile;
  }
  get class() {
    return this._client.class;
  }
  get section() {
    return this._client.section;
  }
  get subject() {
    return this._client.subject;
  }
  get subjectAllocation() {
    return this._client.subjectAllocation;
  }
  get studentRecord() {
    return this._client.studentRecord;
  }
  get parent() {
    return this._client.parent;
  }
  get studentGuardian() {
    return this._client.studentGuardian;
  }
  get attendanceRecord() {
    return this._client.attendanceRecord;
  }
  get academicYear() {
    return this._client.academicYear;
  }
  get term() {
    return this._client.term;
  }
  get exam() {
    return this._client.exam;
  }
  get result() {
    return this._client.result;
  }
  get feeStructure() {
    return this._client.feeStructure;
  }
  get studentInvoice() {
    return this._client.studentInvoice;
  }
  get payment() {
    return this._client.payment;
  }
  get room() {
    return this._client.room;
  }
  get timetableSlot() {
    return this._client.timetableSlot;
  }
  get notificationLog() {
    return this._client.notificationLog;
  }
  get messageThread() {
    return this._client.messageThread;
  }
  get message() {
    return this._client.message;
  }
  get announcement() {
    return this._client.announcement;
  }
  get auditLog() {
    return this._client.auditLog;
  }
  get course() {
    return this._client.course;
  }
  get courseModule() {
    return this._client.courseModule;
  }
  get lesson() {
    return this._client.lesson;
  }
  get material() {
    return this._client.material;
  }
  get assignment() {
    return this._client.assignment;
  }
  get submission() {
    return this._client.submission;
  }
  get paymentTransaction() {
    return this._client.paymentTransaction;
  }
}
