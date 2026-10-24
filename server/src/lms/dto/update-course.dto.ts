import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  meetLink?: string;

  @IsOptional()
  @IsString()
  @IsIn(['blue', 'green', 'purple', 'orange', 'slate', 'rose'])
  theme?: string;
}
