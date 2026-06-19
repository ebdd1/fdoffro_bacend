import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, createPropertyDto: CreatePropertyDto) {
    const { facilities, priceMonthly, totalRooms, ...data } = createPropertyDto;
    const roomCount = Math.max(1, totalRooms ?? 1);

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
        // Auto-create `roomCount` available rooms (Kamar 1..N), all at priceMonthly.
        rooms: priceMonthly && priceMonthly > 0 ? {
          create: Array.from({ length: roomCount }, (_, i) => ({
            roomNumber: String(i + 1),
            priceMonthly,
            status: 'available',
          }))
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

    // Enforce max_photos_per_listing limit from admin settings.
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'max_photos_per_listing' } });
    const maxPhotos = cfg ? Number(cfg.value) || 5 : 5;
    const currentCount = await this.prisma.media.count({ where: { propertyId } });
    if (currentCount + urls.length > maxPhotos) {
      throw new BadRequestException(`Maksimal ${maxPhotos} foto per kost. Hapus foto lama untuk menambah yang baru.`);
    }

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

  // Add `count` rooms to an existing property, continuing the room numbering
  // from the highest existing numeric roomNumber. Ownership enforced at controller.
  async addRooms(propertyId: string, count: number, priceMonthly: number) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Properti tidak ditemukan');
    if (!count || count < 1) throw new BadRequestException('Jumlah kamar minimal 1');
    if (!priceMonthly || priceMonthly <= 0) throw new BadRequestException('Harga kamar tidak valid');

    const existing = await this.prisma.room.findMany({
      where: { propertyId },
      select: { roomNumber: true },
    });
    const maxNum = existing.reduce((max, r) => {
      const n = parseInt(r.roomNumber, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    await this.prisma.room.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        propertyId,
        roomNumber: String(maxNum + i + 1),
        priceMonthly,
        status: 'available',
      })),
    });
    return this.prisma.room.findMany({ where: { propertyId } });
  }

  // Delete a single room from a property. Blocked when the room is occupied or
  // has any rental order history (to preserve records / avoid FK errors).
  async deleteRoom(propertyId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.propertyId !== propertyId) {
      throw new NotFoundException('Kamar tidak ditemukan pada properti ini');
    }
    if (room.status === 'occupied') {
      throw new BadRequestException('Kamar sedang terisi, tidak bisa dihapus');
    }
    const orderCount = await this.prisma.rentalOrder.count({ where: { roomId } });
    if (orderCount > 0) {
      throw new BadRequestException('Kamar memiliki riwayat sewa, tidak bisa dihapus');
    }
    await this.prisma.room.delete({ where: { id: roomId } });
    return { id: roomId, deleted: true };
  }

  // Delete a single property. Owner-only — verified via controller.
  async deleteProperty(propertyId: string, ownerId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { rooms: { select: { id: true, status: true } } },
    });
    if (!property) throw new NotFoundException('Properti tidak ditemukan');
    if (property.ownerId !== ownerId) throw new ForbiddenException('Bukan properti Anda');

    // Block deletion if any room is occupied
    const occupied = property.rooms.filter(r => r.status === 'occupied');
    if (occupied.length > 0) {
      throw new BadRequestException(
        `Tidak dapat menghapus kost — ${occupied.length} kamar masih terisi. Kosongkan terlebih dahulu.`,
      );
    }

    // Cascade delete: media, rooms (without occupied), watchlist
    await this.prisma.$transaction([
      this.prisma.media.deleteMany({ where: { propertyId } }),
      this.prisma.room.deleteMany({ where: { propertyId, status: { not: 'occupied' } } }),
      this.prisma.watchlist.deleteMany({ where: { propertyId } }),
      this.prisma.property.delete({ where: { id: propertyId } }),
    ]);

    return { id: propertyId, deleted: true };
  }

  // Bulk delete — only deletes properties owned by the caller that are fully vacant.
  async deletePropertiesBulk(propertyIds: string[], ownerId: string) {
    if (!propertyIds?.length) throw new BadRequestException('Tidak ada kost yang dipilih');
    const results = await Promise.allSettled(
      propertyIds.map(id => this.deleteProperty(id, ownerId)),
    );
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.message || r.reason?.response?.data?.message || 'Gagal')
      .filter(Boolean);
    return { deleted: fulfilled, failed: rejected };
  }
}
