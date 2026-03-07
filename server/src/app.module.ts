import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './common/tenant/tenant.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { ClassesModule } from './classes/classes.module';
import { SectionsModule } from './sections/sections.module';
import { SubjectsModule } from './subjects/subjects.module';
import { AllocationsModule } from './allocations/allocations.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExamsModule } from './exams/exams.module';
import { ResultsModule } from './results/results.module';
import { ReportsModule } from './reports/reports.module';
import { PortalModule } from './portal/portal.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TeachersModule } from './teachers/teachers.module';
import { TermsModule } from './terms/terms.module';
import { BillingModule } from './billing/billing.module';
import { AiModule } from './ai/ai.module';
import { TimetableModule } from './timetable/timetable.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagingModule } from './messaging/messaging.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    PrismaModule,
    TenantModule,
    AuditModule,
    AuthModule,
    AiModule,
    AcademicYearModule,
    ClassesModule,
    SectionsModule,
    SubjectsModule,
    AllocationsModule,
    StudentsModule,
    ParentsModule,
    AttendanceModule,
    ExamsModule,
    ResultsModule,
    ReportsModule,
    PortalModule,
    AnalyticsModule,
    TeachersModule,
    TermsModule,
    BillingModule,
    TimetableModule,
    NotificationsModule,
    MessagingModule,
    AnnouncementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}