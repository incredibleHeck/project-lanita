import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

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

  @IsOptional()
  @ValidateIf((o) => o.defaultRoomId != null && o.defaultRoomId !== '')
  @IsUUID()
  defaultRoomId?: string | null;
}
