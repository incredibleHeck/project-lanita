import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ABACGuard } from '../common/guards/abac.guard';

@Module({
  controllers: [ResultsController],
  providers: [ResultsService, ABACGuard],
})
export class ResultsModule {}
