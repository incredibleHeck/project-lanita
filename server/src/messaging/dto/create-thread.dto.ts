import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty()
  @IsUUID()
  parentId: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;
}
