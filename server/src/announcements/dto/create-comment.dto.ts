import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
