import { IsNumber, IsOptional, Min } from 'class-validator';

export class ProfitCalculatorDto {
  @IsNumber()
  @Min(1)
  sell_price_uzs!: number;

  @IsNumber()
  @Min(0.01)
  unit_cost_usd!: number;

  @IsNumber()
  @Min(1)
  usd_to_uzs!: number;

  @IsNumber()
  @Min(0)
  uzum_commission_pct!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fbo_cost_uzs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ads_spend_uzs?: number;

  @IsNumber()
  @Min(1)
  quantity!: number;
}
