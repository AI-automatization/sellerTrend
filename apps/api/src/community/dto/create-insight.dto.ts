import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInsightDto {
  @ApiProperty({ description: 'Insight title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Insight content' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  category!: string;
}
