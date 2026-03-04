import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookConsultationDto {
  @ApiProperty({ description: 'Scheduled date/time (ISO string)' })
  @IsString()
  @IsNotEmpty()
  scheduled_at!: string;
}
