import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CreatePriceTestDto {
  @IsString()
  @IsNotEmpty()
  product_id!: string;

  @IsNumber()
  @Min(1)
  original_price!: number;

  @IsNumber()
  @Min(1)
  test_price!: number;
}
