import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BootstrapAdminDto {
  @ApiProperty({ description: 'Admin email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Bootstrap secret key' })
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @ApiPropertyOptional({ description: 'Force re-bootstrap even if admin exists' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
