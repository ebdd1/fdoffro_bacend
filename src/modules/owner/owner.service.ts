import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnerService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(ownerId: string) {
    const properties = await this.prisma.property.findMany({
      where: { ownerId },
      include: {
        rooms: true,
      },
    });

    const rooms = await this.prisma.room.findMany({
      where: {
        property: { ownerId },
      },
    });

    return {
      properties,
      rooms,
    };
  }

  async updateRoomStatus(roomId: string, status: 'available' | 'occupied' | 'renovation') {
    const roomExists = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!roomExists) {
      return null;
    }

    return this.prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }
}
