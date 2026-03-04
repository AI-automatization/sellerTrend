import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CaptureBaselineDto {
  @ApiProperty({ description: 'Baseline label' })
  @IsString()
  @IsNotEmpty()
  label!: string;
}
