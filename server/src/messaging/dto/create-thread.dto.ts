import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;
}
