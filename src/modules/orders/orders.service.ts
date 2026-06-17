import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';

const ORDER_INCLUDE = {
  seeker: { select: { id: true, name: true, avatar_url: true, phone: true } },
  owner: { select: { id: true, name: true, avatar_url: true, phone: true } },
  property: { select: { id: true, name: true, city: true, address: true } },
  room: { select: { id: true, roomNumber: true, priceMonthly: true, status: true } },
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private notifications: NotificationsService,
  ) {}

  private async emit(orderId: string) {
    const order = await this.prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (order) this.realtime.emitOrderUpdate(order as any);
    return order;
  }

  // Create + push a rental notification to the given recipient.
  private async notify(
    userId: string,
    title: string,
    body: string,
    orderId: string,
  ) {
    try {
      await this.notifications.create({ userId, type: 'order', title, body, orderId });
    } catch {
      // A notification failure must never break the order transaction.
    }
  }

  async create(seekerId: string, dto: CreateOrderDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { property: true },
    });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');
    if (room.status !== 'available')
      throw new BadRequestException('Kamar tidak tersedia');

    const ownerId = room.property.ownerId;
    if (ownerId === seekerId)
      throw new BadRequestException('Anda tidak bisa menyewa properti sendiri');

    const order = await this.prisma.rentalOrder.create({
      data: {
        seekerId,
        ownerId,
        propertyId: room.propertyId,
        roomId: room.id,
        status: 'pending',
        startDate: new Date(dto.startDate),
        durationMonths: dto.durationMonths,
        priceMonthly: room.priceMonthly,
        totalAmount: room.priceMonthly * dto.durationMonths,
      },
      include: ORDER_INCLUDE,
    });
    this.realtime.emitOrderUpdate(order as any);
    await this.notify(
      ownerId,
      'Permintaan sewa baru',
      `${order.seeker.name} mengajukan sewa untuk ${order.property.name} (Kamar ${order.room.roomNumber}).`,
      order.id,
    );
    return order;
  }

  async findMine(userId: string) {
    return this.prisma.rentalOrder.findMany({
      where: { OR: [{ seekerId: userId }, { ownerId: userId }] },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.rentalOrder.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getOrThrow(id: string) {
    const order = await this.prisma.rentalOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return order;
  }

  // Owner accepts a pending order -> awaiting payment
  async accept(id: string, userId: string) {
    const order = await this.getOrThrow(id);
    if (order.ownerId !== userId) throw new ForbiddenException('Bukan order Anda');
    if (order.status !== 'pending')
      throw new BadRequestException('Order tidak dalam status menunggu');
    await this.prisma.rentalOrder.update({
      where: { id },
      data: { status: 'awaiting_payment' },
    });
    const updated = await this.emit(id);
    if (updated) {
      await this.notify(
        updated.seekerId,
        'Sewa diterima',
        `Pengajuan sewa ${updated.property.name} diterima. Silakan selesaikan pembayaran.`,
        updated.id,
      );
    }
    return updated;
  }

  // Owner rejects a pending order
  async reject(id: string, userId: string) {
    const order = await this.getOrThrow(id);
    if (order.ownerId !== userId) throw new ForbiddenException('Bukan order Anda');
    if (order.status !== 'pending')
      throw new BadRequestException('Order tidak dalam status menunggu');
    await this.prisma.rentalOrder.update({ where: { id }, data: { status: 'rejected' } });
    const updated = await this.emit(id);
    if (updated) {
      await this.notify(
        updated.seekerId,
        'Sewa ditolak',
        `Maaf, pengajuan sewa ${updated.property.name} ditolak pemilik. Cari kost lain yuk.`,
        updated.id,
      );
    }
    return updated;
  }

  // Seeker pays -> order active, room occupied
  async pay(id: string, userId: string) {
    const order = await this.getOrThrow(id);
    if (order.seekerId !== userId) throw new ForbiddenException('Bukan order Anda');
    if (order.status !== 'awaiting_payment')
      throw new BadRequestException('Order belum siap dibayar');
    await this.prisma.$transaction([
      this.prisma.rentalOrder.update({
        where: { id },
        data: { status: 'active', paidAt: new Date() },
      }),
      this.prisma.room.update({
        where: { id: order.roomId },
        data: { status: 'occupied' },
      }),
    ]);
    const updated = await this.emit(id);
    if (updated) {
      await this.notify(
        updated.ownerId,
        'Pembayaran diterima',
        `${updated.seeker.name} telah membayar sewa ${updated.property.name} (Kamar ${updated.room.roomNumber}). Sewa kini aktif.`,
        updated.id,
      );
    }
    return updated;
  }

  // Either party cancels before it becomes active
  async cancel(id: string, userId: string) {
    const order = await this.getOrThrow(id);
    if (order.seekerId !== userId && order.ownerId !== userId)
      throw new ForbiddenException('Bukan order Anda');
    if (!['pending', 'awaiting_payment'].includes(order.status))
      throw new BadRequestException('Order tidak bisa dibatalkan');
    await this.prisma.rentalOrder.update({ where: { id }, data: { status: 'cancelled' } });
    const updated = await this.emit(id);
    if (updated) {
      // Notify the other party (the one who did not press cancel).
      const recipientId = userId === updated.seekerId ? updated.ownerId : updated.seekerId;
      const actor = userId === updated.seekerId ? updated.seeker.name : updated.owner.name;
      await this.notify(
        recipientId,
        'Sewa dibatalkan',
        `${actor} membatalkan sewa ${updated.property.name} (Kamar ${updated.room.roomNumber}).`,
        updated.id,
      );
    }
    return updated;
  }

  // Owner completes an active rental -> room available again
  async complete(id: string, userId: string) {
    const order = await this.getOrThrow(id);
    if (order.ownerId !== userId) throw new ForbiddenException('Bukan order Anda');
    if (order.status !== 'active')
      throw new BadRequestException('Order belum aktif');
    await this.prisma.$transaction([
      this.prisma.rentalOrder.update({ where: { id }, data: { status: 'completed' } }),
      this.prisma.room.update({
        where: { id: order.roomId },
        data: { status: 'available' },
      }),
    ]);
    const updated = await this.emit(id);
    if (updated) {
      await this.notify(
        updated.seekerId,
        'Sewa selesai',
        `Masa sewa ${updated.property.name} (Kamar ${updated.room.roomNumber}) telah selesai. Terima kasih!`,
        updated.id,
      );
    }
    return updated;
  }
}
