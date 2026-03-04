import { IsString, IsNotEmpty, IsArray, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
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
  @ValidateIf((o: SendNotificationDto) => typeof o.target === 'string')
  @IsString()
  @ValidateIf((o: SendNotificationDto) => Array.isArray(o.target))
  @IsArray()
  target!: 'all' | string[];
}
