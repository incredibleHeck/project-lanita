import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { ABACGuard } from '../common/guards/abac.guard';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, ABACGuard],
})
export class StudentsModule {}
