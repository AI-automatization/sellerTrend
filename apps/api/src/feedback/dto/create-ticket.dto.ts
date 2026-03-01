import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { FeedbackType, FeedbackPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsEnum(FeedbackPriority)
  priority!: FeedbackPriority;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
