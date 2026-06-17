import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  orderId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  // Persist a notification and push it to the recipient in realtime.
  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        orderId: input.orderId ?? null,
      },
    });
    this.realtime.emitNotification(input.userId, notification);
    return notification;
  }

  findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }
}
