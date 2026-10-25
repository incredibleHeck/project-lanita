import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeeStructureDto {
  @ApiProperty({ example: 'Tuition Fee - JSS 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 45000.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'b56740bc-9ffc-4c6e-81fb-55f657a5840d' })
  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ required: false, description: 'Optional specific class ID. If null, applies to all classes.' })
  @IsOptional()
  @IsUUID()
  classId?: string;
}
