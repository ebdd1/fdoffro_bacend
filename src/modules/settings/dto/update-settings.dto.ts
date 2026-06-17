import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SiteConfigItemDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteConfigItemDto)
  items: SiteConfigItemDto[];
}
