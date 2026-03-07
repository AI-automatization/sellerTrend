import { IsString, IsNotEmpty, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookConsultationDto {
  @ApiProperty({ description: 'Scheduled date/time (ISO string, must be in the future)' })
  @IsString()
  @IsNotEmpty()
  @IsISO8601()
  scheduled_at!: string;
}
