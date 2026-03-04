import { IsBoolean, IsInt, IsOptional, IsArray, IsString, Min, Max } from 'class-validator';

const MAX_ONBOARDING_STEP = 10;

export class UpdateOnboardingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ONBOARDING_STEP)
  step?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketplaces?: string[];
}
