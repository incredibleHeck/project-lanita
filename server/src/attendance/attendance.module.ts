import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ABACGuard } from '../common/guards/abac.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, ABACGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
