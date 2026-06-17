import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateUserDto, UpdateListingDto } from './dto/admin.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user: verify/activate/role (admin only)' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List all property listings for moderation (admin only)' })
  async listListings() {
    return this.adminService.listListings();
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Moderate a listing: verify/status (admin only)' })
  async updateListing(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.adminService.updateListing(id, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Global platform statistics (admin only)' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all rental orders (admin only)' })
  async listOrders() {
    return this.adminService.listOrders();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for monitoring (admin only)' })
  async listConversations() {
    return this.adminService.listConversations();
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Read messages of a conversation (admin only)' })
  async getConversationMessages(@Param('id') id: string) {
    return this.adminService.getConversationMessages(id);
  }
}
