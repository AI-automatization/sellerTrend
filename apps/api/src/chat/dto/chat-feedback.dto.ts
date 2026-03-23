import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum FeedbackValue {
  UP = 'UP',
  DOWN = 'DOWN',
}

export class ChatFeedbackDto {
  @IsEnum(FeedbackValue)
  feedback!: FeedbackValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback_text?: string;
}
