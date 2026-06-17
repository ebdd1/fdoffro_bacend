import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get public site settings (no auth)' })
  async getPublic() {
    return this.settingsService.getPublic();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all site settings (admin only)' })
  async getAll() {
    return this.settingsService.getAll();
  }

  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update site settings (admin only)' })
  async update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.upsertMany(dto.items);
  }
}
