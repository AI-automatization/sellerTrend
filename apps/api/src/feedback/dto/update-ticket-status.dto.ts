import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FeedbackStatus } from '@prisma/client';

export class UpdateTicketStatusDto {
  @ApiProperty({ description: 'New ticket status', enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  status!: FeedbackStatus;
}
