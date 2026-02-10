import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsUUID()
  @IsNotEmpty()
  classId: string;
}
