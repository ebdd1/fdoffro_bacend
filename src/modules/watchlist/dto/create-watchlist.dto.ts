import { IsString, IsNotEmpty } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  @IsNotEmpty()
  seekerId: string;

  @IsString()
  @IsNotEmpty()
  propertyId: string;
}
