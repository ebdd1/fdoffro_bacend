import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, UpdateListingDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar_url: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} tidak ditemukan`);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar_url: true,
        isVerified: true,
        isActive: true,
      },
    });
  }

  async listListings() {
    const properties = await this.prisma.property.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        rooms: { select: { status: true, priceMonthly: true } },
        facilities: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return properties.map((p) => ({
      ...p,
      facilities: p.facilities.map((f) => f.name),
    }));
  }

  async updateListing(id: string, dto: UpdateListingDto) {
    const prop = await this.prisma.property.findUnique({ where: { id } });
    if (!prop) throw new NotFoundException(`Properti ${id} tidak ditemukan`);
    return this.prisma.property.update({ where: { id }, data: dto });
  }

  async listConversations() {
    return this.prisma.conversation.findMany({
      include: {
        seeker: { select: { id: true, name: true, avatar_url: true, role: true } },
        owner: { select: { id: true, name: true, avatar_url: true, role: true } },
        property: { select: { id: true, name: true, city: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatar_url: true, role: true } } },
    });
  }

  async listOrders() {
    return this.prisma.rentalOrder.findMany({
      include: {
        seeker: { select: { id: true, name: true, avatar_url: true, phone: true } },
        owner: { select: { id: true, name: true, avatar_url: true, phone: true } },
        property: { select: { id: true, name: true, city: true, address: true } },
        room: { select: { id: true, roomNumber: true, priceMonthly: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [
      totalUsers,
      totalSeekers,
      totalOwners,
      totalAdmins,
      totalProperties,
      verifiedProperties,
      totalRooms,
      totalConversations,
      properties,
      totalOrders,
      activeOrders,
      pendingOrders,
      activeOrderRows,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'seeker' } }),
      this.prisma.user.count({ where: { role: 'owner' } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.property.count(),
      this.prisma.property.count({ where: { isVerified: true } }),
      this.prisma.room.count(),
      this.prisma.conversation.count(),
      this.prisma.property.findMany({ select: { city: true } }),
      this.prisma.rentalOrder.count(),
      this.prisma.rentalOrder.count({ where: { status: 'active' } }),
      this.prisma.rentalOrder.count({ where: { status: 'pending' } }),
      this.prisma.rentalOrder.findMany({ where: { status: 'active' }, select: { totalAmount: true } }),
    ]);

    // Normalize city names so casing/whitespace variants ("jakarta" vs
    // "Jakarta ") collapse into a single, title-cased bucket.
    const titleCase = (s: string) =>
      s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    const cityBreakdown: Record<string, number> = {};
    for (const p of properties) {
      const raw = (p.city || '').trim();
      if (!raw) continue;
      const key = titleCase(raw);
      cityBreakdown[key] = (cityBreakdown[key] || 0) + 1;
    }

    const revenue = activeOrderRows.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      users: { total: totalUsers, seekers: totalSeekers, owners: totalOwners, admins: totalAdmins },
      properties: {
        total: totalProperties,
        verified: verifiedProperties,
        pending: totalProperties - verifiedProperties,
      },
      totalRooms,
      totalConversations,
      cityBreakdown,
      orders: {
        total: totalOrders,
        active: activeOrders,
        pending: pendingOrders,
        revenue,
      },
    };
  }
}
