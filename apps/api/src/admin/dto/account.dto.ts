import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsEmail,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  company_name!: string;

  @ApiProperty({ description: 'Account email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: 'User role' })
  @IsString()
  @IsNotEmpty()
  role!: string;
}

export class UpdateAccountStatusDto {
  @ApiProperty({ description: 'New account status' })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class UpdateAccountPhoneDto {
  @ApiProperty({ description: 'Phone number (null to clear)', nullable: true })
  @IsOptional()
  @IsString()
  phone!: string | null;
}

enum BulkAction {
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
}

export class BulkAccountActionDto {
  @ApiProperty({ description: 'Account IDs to process', type: [String] })
  @IsArray()
  @IsString({ each: true })
  account_ids!: string[];

  @ApiProperty({ description: 'Bulk action to perform', enum: BulkAction })
  @IsEnum(BulkAction)
  action!: 'SUSPEND' | 'ACTIVATE';
}

export class SetPlanDto {
  @ApiProperty({ description: 'Plan name', enum: ['FREE', 'PRO', 'MAX', 'COMPANY'] })
  @IsString()
  @IsIn(['FREE', 'PRO', 'MAX', 'COMPANY'])
  plan!: string;
}
