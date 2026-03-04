import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PriceElasticityDto {
  @ApiProperty({ description: 'Original price' })
  @IsNumber()
  @Min(0.01)
  price_old!: number;

  @ApiProperty({ description: 'New price' })
  @IsNumber()
  @Min(0.01)
  price_new!: number;

  @ApiProperty({ description: 'Quantity sold at original price' })
  @IsNumber()
  @Min(0)
  qty_old!: number;

  @ApiProperty({ description: 'Quantity sold at new price' })
  @IsNumber()
  @Min(0)
  qty_new!: number;
}
