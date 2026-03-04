import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ description: 'Report title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report type (e.g. sales, inventory, revenue)' })
  @IsString()
  @IsNotEmpty()
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
