import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: 'User role' })
  @IsString()
  @IsNotEmpty()
  role!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class UpdateRoleDto {
  @ApiProperty({ description: 'New role' })
  @IsString()
  @IsNotEmpty()
  role!: string;
}
