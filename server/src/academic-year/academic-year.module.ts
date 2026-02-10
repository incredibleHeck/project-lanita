import { Module } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { AcademicYearController } from './academic-year.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Not strictly needed if global, but good for clarity.
  controllers: [AcademicYearController],
  providers: [AcademicYearService],
})
export class AcademicYearModule {}
