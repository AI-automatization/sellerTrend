import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email address of the team member to invite' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Role to assign (default: USER)' })
  @IsOptional()
  @IsString()
  role?: string;
}
