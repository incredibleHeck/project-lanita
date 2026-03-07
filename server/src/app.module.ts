import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}