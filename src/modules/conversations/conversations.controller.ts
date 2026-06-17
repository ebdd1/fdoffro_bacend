import { Controller, Get, Post, Patch, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@Query('userId') userId: string) {
    const id = userId || 'user-seeker-1';
    return this.conversationsService.findByUserId(id);
  }

  @Post()
  async createConversation(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return this.conversationsService.findMessages(id);
  }

  @Post(':id/messages')
  async createMessage(@Param('id') id: string, @Body() dto: CreateMessageDto) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return this.conversationsService.createMessage(id, dto);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    const conversation = await this.conversationsService.findOne(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return this.conversationsService.markRead(id);
  }
}
