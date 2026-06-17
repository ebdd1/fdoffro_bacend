import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, createPropertyDto: CreatePropertyDto) {
    const { facilities, priceMonthly, ...data } = createPropertyDto;

    // When the admin enables auto-verification, new listings skip the moderation
    // queue and go live immediately.
    const autoCfg = await this.prisma.siteConfig.findUnique({ where: { key: 'auto_verify_listings' } });
    const autoVerify = autoCfg?.value === 'true';

    return this.prisma.property.create({
      data: {
        ...data,
        ownerId,
        ...(autoVerify ? { isVerified: true, status: 'active' } : {}),
        facilities: facilities ? {
          connectOrCreate: facilities.map(f => ({
            where: { name: f },
            create: { name: f }
          }))
        } : undefined,
        // Seed an initial available room so the listing has a real price.
        rooms: priceMonthly && priceMonthly > 0 ? {
          create: [{ roomNumber: '1', priceMonthly, status: 'available' }]
        } : undefined
      },
      include: {
        facilities: true,
        rooms: true,
        media: true,
      }
    });
  }

  async addMedia(propertyId: string, urls: string[]) {
    // Verify the property exists and belongs to the caller (enforced at controller level).
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Properti tidak ditemukan');

    await this.prisma.media.createMany({
      data: urls.map((url) => ({
        propertyId,
        url_original: url,
        url_medium: url,
        url_thumbnail: url,
        latitude: null,
        longitude: null,
      })),
    });
    return this.prisma.media.findMany({ where: { propertyId } });
  }

  async findAll(query: QueryPropertyDto) {
    const { skip, take, city, status, ownerId } = query;
    const where: any = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const [total, properties] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip,
        take,
        include: {
          owner: { select: { id: true, name: true, avatar_url: true } },
          rooms: { select: { id: true, roomNumber: true, status: true, priceMonthly: true } },
          facilities: { select: { name: true } },
          media: { select: { id: true, url_original: true, url_medium: true, url_thumbnail: true } },
        },
      }),
    ]);

    return {
      data: (properties as any[]).map(p => ({
        ...p,
        facilities: p.facilities ? p.facilities.map((f: any) => f.name) : [],
      })),
      meta: {
        total,
        skip,
        take,
      },
    };
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        rooms: true,
        facilities: true,
        media: true,
      },
    });
    if (!property) return null;
    return {
      ...property,
      facilities: property.facilities ? property.facilities.map(f => f.name) : [],
    };
  }

  async findRoomsByPropertyId(propertyId: string) {
    return this.prisma.room.findMany({
      where: { propertyId }
    });
  }
}
