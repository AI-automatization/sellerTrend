import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class StartRunDto {
  @IsString()
  @IsNotEmpty()
  input!: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsBoolean()
  fromSearch?: boolean;
}
