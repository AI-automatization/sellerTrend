import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConsultationDto {
  @ApiProperty({ description: 'Consultation title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Consultation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Price in UZS' })
  @IsNumber()
  @Min(0)
  price_uzs!: number;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration_min?: number;
}
