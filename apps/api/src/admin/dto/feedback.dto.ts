import { IsString, IsNotEmpty, IsArray, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminUpdateFeedbackStatusDto {
  @ApiProperty({ description: 'New feedback status' })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class AdminSendFeedbackMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class AdminSendNotificationDto {
  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ description: 'Notification type' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'Target: "all" for broadcast or array of account IDs',
    oneOf: [{ type: 'string', enum: ['all'] }, { type: 'array', items: { type: 'string' } }],
  })
  @ValidateIf((o: AdminSendNotificationDto) => typeof o.target === 'string')
  @IsString()
  @ValidateIf((o: AdminSendNotificationDto) => Array.isArray(o.target))
  @IsArray()
  target!: 'all' | string[];
}

export class CreateNotificationTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Template message' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ description: 'Notification type' })
  @IsString()
  @IsNotEmpty()
  type!: string;
}
