import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWatchlistDto {
  @ApiProperty({ description: 'Watchlist name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Watchlist description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product IDs to include', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  product_ids!: string[];
}
