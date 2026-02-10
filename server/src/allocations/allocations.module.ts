import { Module } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';

@Module({
  controllers: [AllocationsController],
  providers: [AllocationsService],
})
export class AllocationsModule {}
