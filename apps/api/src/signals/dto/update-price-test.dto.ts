import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePriceTestDto {
  @ApiPropertyOptional({ description: 'Test status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Original sales count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  original_sales?: number;

  @ApiPropertyOptional({ description: 'Test sales count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  test_sales?: number;

  @ApiPropertyOptional({ description: 'Test conclusion' })
  @IsOptional()
  @IsString()
  conclusion?: string;
}
