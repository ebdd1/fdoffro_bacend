import { Controller, Get, Put, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';

@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard')
  async getDashboard(@Query('ownerId') ownerId: string) {
    const id = ownerId || 'user-owner-1';
    return this.ownerService.getDashboardData(id);
  }

  @Put('rooms/:id/status')
  async updateRoomStatus(@Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    const updatedRoom = await this.ownerService.updateRoomStatus(id, dto.status);
    if (!updatedRoom) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return updatedRoom;
  }
}
