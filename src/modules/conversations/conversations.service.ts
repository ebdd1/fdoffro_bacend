import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async findByUserId(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [
          { seekerId: userId },
          { ownerId: userId },
        ],
      },
      include: {
        seeker: true,
        owner: true,
        property: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Admin: every conversation on the platform (read-only monitoring).
  async findAll() {
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

  async findOne(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        seeker: true,
        owner: true,
        property: true,
      },
    });
  }

  async create(dto: CreateConversationDto) {
    // seekerId is enforced by controller — set from JWT [F-010]
    const seekerId = dto.seekerId!;
    const existing = await this.prisma.conversation.findFirst({
      where: {
        seekerId,
        ownerId: dto.ownerId,
        propertyId: dto.propertyId,
      },
      include: { seeker: true, owner: true, property: true },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        seekerId,
        ownerId: dto.ownerId,
        propertyId: dto.propertyId,
        unreadCount: 0,
      },
      include: {
        seeker: true,
        owner: true,
        property: true,
      },
    });
  }

  // Reset unread badge when a participant opens the thread.
  async markRead(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
  }

  // Mark individual message as read
  async markMessageAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
      include: {
        conversation: true,
        sender: true,
      },
    });

    // Broadcast read receipt to sender via realtime
    try {
      this.realtime.emitMessageRead({
        messageId,
        conversationId: message.conversationId,
        readBy: userId,
        readAt: message.readAt!,
      });
    } catch (err) {
      console.warn('Realtime read receipt emit failed:', err);
    }

    return message;
  }

  /**
   * Fetch messages with cursor-based pagination.
   *
   * CRITICAL FIX: Previous implementation fetched ALL messages without limit,
   * causing unbounded queries that crash the database with large conversations.
   *
   * Pagination strategy:
   * - Default: 50 messages per page
   * - Cursor: Message ID to seek from (for stable pagination)
   * - Direction: 'before' for older, 'after' for newer
   *
   * Performance: Uses composite index (conversationId, createdAt)
   * for O(1) cursor seek instead of OFFSET which is O(n).
   */
  async findMessages(conversationId: string, dto: QueryMessagesDto) {
    const limit = Math.min(dto.limit ?? 50, 100); // Cap at 100
    const cursorId = dto.cursor;
    const direction = dto.direction ?? 'after';

    // Build query with cursor-based pagination
    const whereClause: any = { conversationId };

    if (cursorId) {
      // Get cursor message to determine direction
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: cursorId },
        select: { createdAt: true },
      });

      if (cursorMessage) {
        if (direction === 'before') {
          // Load messages OLDER than cursor (scroll up in chat)
          whereClause.createdAt = { lt: cursorMessage.createdAt };
        } else {
          // Load messages NEWER than cursor (scroll down)
          whereClause.createdAt = { gt: cursorMessage.createdAt };
        }
      }
    }

    // Fetch one extra to determine if there are more messages
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: direction === 'before' ? 'desc' : 'asc' },
      take: limit + 1, // Fetch one extra to check for next page
      include: {
        sender: true,
      },
    });

    // Determine if there are more messages
    const hasMore = messages.length > limit;
    const paginatedMessages = hasMore ? messages.slice(0, limit) : messages;

    // For 'before' direction, reverse to get chronological order
    const orderedMessages = direction === 'before' ? paginatedMessages.reverse() : paginatedMessages;

    // Calculate next cursor (last message's ID for forward pagination)
    const nextCursor = hasMore
      ? paginatedMessages[paginatedMessages.length - 1].id
      : null;

    return {
      messages: orderedMessages,
      nextCursor,
      hasMore,
      total: paginatedMessages.length,
    };
  }

  async createMessage(conversationId: string, dto: CreateMessageDto) {
    try {
      const contentType = dto.contentType ?? 'text';
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId: dto.senderId!, // controller guarantees this is set from JWT [F-010]
          content: dto.content,
          contentType,
        },
        include: {
          sender: true,
        },
      });

      // Human-readable preview for non-text messages in the thread list.
      const preview =
        contentType === 'image' ? '📷 Foto' : contentType === 'location' ? '📍 Lokasi' : dto.content;

      // Update lastMessage and increment unreadCount
      const conversation = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: preview,
          unreadCount: { increment: 1 },
        },
      });

      // Push the new message to both participants in realtime (wrapped in try-catch to prevent errors)
      try {
        this.realtime.emitMessage({
          conversationId,
          seekerId: conversation.seekerId,
          ownerId: conversation.ownerId,
          message,
        });
      } catch (err) {
        console.warn('Realtime emit failed:', err);
      }

      return message;
    } catch (error) {
      console.error('createMessage error:', error);
      throw error;
    }
  }
}
