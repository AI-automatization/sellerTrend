import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDescriptionDto {
  @ApiProperty({ description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Product attributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | null>;

  @ApiPropertyOptional({ description: 'Product category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'SEO keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
