import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async getAlerts(@Query('seekerId') seekerId: string) {
    const id = seekerId || 'user-seeker-1';
    return this.alertsService.findBySeekerId(id);
  }

  @Post()
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }
}
