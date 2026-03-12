import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class GenerateInvoicesDto {
  @IsUUID()
  @IsNotEmpty()
  termId: string;

  @IsUUID()
  @IsOptional()
  classId?: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;
}
