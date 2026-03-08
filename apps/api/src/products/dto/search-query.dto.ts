import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query', example: 'telefon' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;

  @ApiProperty({ required: false, default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = 24;
}
