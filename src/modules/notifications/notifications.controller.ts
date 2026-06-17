import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  mine(@Request() req: any) {
    return this.notificationsService.findByUser(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
