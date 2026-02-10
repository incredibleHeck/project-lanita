import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';
import { IsUUID as IsUUIDV4 } from 'class-validator';

export class AttendanceRecordDto {
  @IsUUIDV4()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateAttendanceBatchDto {
  @IsUUIDV4()
  @IsNotEmpty()
  subjectAllocationId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
