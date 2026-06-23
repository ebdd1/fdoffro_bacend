import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** All conversation routes require authentication [F-010 IDOR fix] */
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // UserId comes from JWT — not from client query param [F-010]
  @Get()
  async getConversations(@Request() req: any) {
    return this.conversationsService.findByUserId(req.user.id);
  }

  @Post()
  async createConversation(@Request() req: any, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create({
      ...dto,
      seekerId: req.user.id, // Force seekerId from JWT, ignore dto.seekerId
    });
  }

  // Only participants of the conversation may read messages [F-010]
  @Get(':id/messages')
  async getMessages(
    @Request() req: any,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
  ) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    // IDOR fix: only seeker or owner of this conversation may access
    if (conversation.seekerId !== req.user.id && conversation.ownerId !== req.user.id) {
      throw new Error('Access denied');
    }
    // CRITICAL FIX: Added pagination to prevent unbounded query on large conversations
    return this.conversationsService.findMessages(id, query);
  }

  @Post(':id/messages')
  async createMessage(@Request() req: any, @Param('id') id: string, @Body() dto: CreateMessageDto) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    // IDOR fix: only participants may send messages
    if (conversation.seekerId !== req.user.id && conversation.ownerId !== req.user.id) {
      throw new Error('Access denied');
    }
    // senderId forced from JWT — not from client body [F-010]
    return this.conversationsService.createMessage(id, { ...dto, senderId: req.user.id });
  }

  @Patch(':id/read')
  async markRead(@Request() req: any, @Param('id') id: string) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    if (conversation.seekerId !== req.user.id && conversation.ownerId !== req.user.id) {
      throw new Error('Access denied');
    }
    return this.conversationsService.markRead(id);
  }

  @Patch(':conversationId/messages/:messageId/read')
  async markMessageAsRead(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const conversation = await this.conversationsService.findOne(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    // Only conversation participants can mark messages as read
    if (conversation.seekerId !== req.user.id && conversation.ownerId !== req.user.id) {
      throw new Error('Access denied');
    }
    return this.conversationsService.markMessageAsRead(messageId, req.user.id);
  }
}
