import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional, IsInt, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  status: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facilities?: string[];

  // Optional starting room price; when provided, an initial room is created
  // so the listing has a real price instead of showing Rp 0.
  @IsNumber()
  @IsOptional()
  priceMonthly?: number;

  // How many rooms to auto-create for this kost (default 1). Owner sets this
  // to match the real number of rooms available; each room gets priceMonthly.
  @IsInt()
  @Min(1)
  @IsOptional()
  totalRooms?: number;
}
