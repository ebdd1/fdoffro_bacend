import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';

@Injectable()
export class WatchlistService {
  constructor(private prisma: PrismaService) {}

  async findBySeekerId(seekerId: string) {
    return this.prisma.watchlist.findMany({
      where: { seekerId },
      include: {
        property: {
          include: {
            owner: true,
            rooms: true,
          },
        },
      },
    });
  }

  async create(dto: CreateWatchlistDto) {
    return this.prisma.watchlist.upsert({
      where: {
        seekerId_propertyId: {
          seekerId: dto.seekerId,
          propertyId: dto.propertyId,
        },
      },
      update: {},
      create: {
        seekerId: dto.seekerId,
        propertyId: dto.propertyId,
      },
      include: {
        property: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.watchlist.delete({
      where: { id },
    });
  }
}
