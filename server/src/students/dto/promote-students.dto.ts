import { IsArray, IsEnum, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PromotionAction {
  PROMOTE = 'PROMOTE',
  REPEAT = 'REPEAT',
  GRADUATE = 'GRADUATE',
}

export class PromotionItemDto {
  @ApiProperty({ description: 'StudentRecord ID or User ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ required: false, description: 'Target Section ID for PROMOTE or REPEAT' })
  @IsOptional()
  @IsUUID()
  targetSectionId?: string;

  @ApiProperty({ enum: PromotionAction, default: PromotionAction.PROMOTE })
  @IsEnum(PromotionAction)
  action: PromotionAction;
}

export class PromoteStudentsDto {
  @ApiProperty({ type: [PromotionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionItemDto)
  promotions: PromotionItemDto[];
}
