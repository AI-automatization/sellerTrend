import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Amount spent in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  spent_uzs?: number;

  @ApiPropertyOptional({ description: 'Number of impressions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  impressions?: number;

  @ApiPropertyOptional({ description: 'Number of clicks' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clicks?: number;

  @ApiPropertyOptional({ description: 'Number of conversions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  conversions?: number;

  @ApiPropertyOptional({ description: 'Revenue in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue_uzs?: number;

  @ApiPropertyOptional({ description: 'Budget in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_uzs?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  end_date?: string;
}
