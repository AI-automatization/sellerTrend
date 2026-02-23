import { IsString, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class TrackCompetitorsDto {
  @IsString()
  product_id!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  competitor_product_ids!: string[];
}
