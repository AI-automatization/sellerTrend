import { IsString, IsNotEmpty, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_REPORT_TYPES = ['product', 'category', 'market'] as const;

export class CreateReportDto {
  @ApiProperty({ description: 'Report title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report type', enum: VALID_REPORT_TYPES })
  @IsIn(VALID_REPORT_TYPES)
  report_type!: string;

  @ApiPropertyOptional({ description: 'Filter criteria' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Column configuration' })
  @IsOptional()
  @IsObject()
  columns?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Cron schedule string' })
  @IsOptional()
  @IsString()
  schedule?: string;
}
