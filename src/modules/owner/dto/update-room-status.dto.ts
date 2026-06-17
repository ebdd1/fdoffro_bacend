import { IsString, IsIn } from 'class-validator';

export class UpdateRoomStatusDto {
  @IsString()
  @IsIn(['available', 'occupied', 'renovation'])
  status: 'available' | 'occupied' | 'renovation';
}
