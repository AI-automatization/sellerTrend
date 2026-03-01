import { IsNumber, IsString, IsOptional, IsArray, IsNotEmpty, Min } from 'class-validator';

export class CreateSearchJobDto {
  @IsNumber()
  @Min(1)
  product_id!: number;

  @IsString()
  @IsNotEmpty()
  product_title!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];
}
