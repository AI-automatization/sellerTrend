import { IsString, IsNotEmpty } from 'class-validator';

export class StartRunDto {
  @IsString()
  @IsNotEmpty()
  input!: string;
}
