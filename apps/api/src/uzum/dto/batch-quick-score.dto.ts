import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BatchQuickScoreDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  product_ids!: string[];
}
