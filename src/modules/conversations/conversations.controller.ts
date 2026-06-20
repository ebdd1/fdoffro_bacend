import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
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
  async getMessages(@Request() req: any, @Param('id') id: string) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    // IDOR fix: only seeker or owner of this conversation may access
    if (conversation.seekerId !== req.user.id && conversation.ownerId !== req.user.id) {
      throw new Error('Access denied');
    }
    return this.conversationsService.findMessages(id);
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
}
