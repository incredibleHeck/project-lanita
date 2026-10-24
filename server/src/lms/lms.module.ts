import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [PrismaModule, AnnouncementsModule],
  controllers: [LmsController],
  providers: [LmsService],
  exports: [LmsService],
})
export class LmsModule {}
