import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeSentimentDto {
  @ApiProperty({ description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  productTitle!: string;

  @ApiProperty({ description: 'Product reviews to analyze', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  reviews!: string[];
}
