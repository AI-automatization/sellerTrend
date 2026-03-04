import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsEmail,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetAccountFeeDto {
  @ApiProperty({ description: 'Daily fee amount (null to use global default)', nullable: true })
  @IsOptional()
  @IsNumber()
  fee!: number | null;
}

export class DepositDto {
  @ApiProperty({ description: 'Deposit amount' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'Deposit description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SetGlobalFeeDto {
  @ApiProperty({ description: 'Global daily fee amount' })
  @IsNumber()
  @Min(0)
  fee!: number;
}

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
  DEPOSIT = 'DEPOSIT',
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  SET_FEE = 'SET_FEE',
}

export class BulkAccountActionDto {
  @ApiProperty({ description: 'Account IDs to process', type: [String] })
  @IsArray()
  @IsString({ each: true })
  account_ids!: string[];

  @ApiProperty({ description: 'Bulk action to perform', enum: BulkAction })
  @IsEnum(BulkAction)
  action!: 'DEPOSIT' | 'SUSPEND' | 'ACTIVATE' | 'SET_FEE';

  @ApiPropertyOptional({ description: 'Deposit amount (for DEPOSIT action)' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Fee amount (for SET_FEE action)' })
  @IsOptional()
  @IsNumber()
  fee?: number;
}
