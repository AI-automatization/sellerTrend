import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChecklistItemDto {
  @ApiProperty({ description: 'Checklist item text' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({ description: 'Whether the item is checked' })
  checked!: boolean;
}

export class SaveChecklistDto {
  @ApiPropertyOptional({ description: 'Associated product ID' })
  @IsOptional()
  @IsString()
  product_id?: string;

  @ApiProperty({ description: 'Checklist title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Checklist items', type: [ChecklistItemDto] })
  @IsArray()
  items!: ChecklistItemDto[];
}
