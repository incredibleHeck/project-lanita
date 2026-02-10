import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;
}
