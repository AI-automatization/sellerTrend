import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CalculateCargoDto {
  @IsOptional()
  @IsString()
  item_name?: string;

  @IsNumber()
  @Min(0.01)
  item_cost_usd!: number;

  @IsNumber()
  @Min(0.01)
  weight_kg!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  provider_id!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customs_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sell_price_uzs?: number;
}
