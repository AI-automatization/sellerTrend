import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RateConsultationDto {
  @ApiProperty({ description: 'Rating (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Optional review text' })
  @IsOptional()
  @IsString()
  review?: string;
}
