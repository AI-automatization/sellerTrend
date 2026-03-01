import { IsString, IsNotEmpty } from 'class-validator';

export class SearchPricesDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;
}
