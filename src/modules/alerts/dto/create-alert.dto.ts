import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  seekerId: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}
