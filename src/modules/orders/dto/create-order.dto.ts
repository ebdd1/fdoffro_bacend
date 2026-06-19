import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsDateString()
  startDate: string;

  @IsInt()
  @Min(1)
  durationMonths: number;

  @IsIn(['transfer', 'cod'])
  paymentMethod: 'transfer' | 'cod';
}
