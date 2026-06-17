import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';

@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getWatchlist(@Query('seekerId') seekerId: string) {
    // seekerId can be defaulted if not passed
    const id = seekerId || 'user-seeker-1';
    return this.watchlistService.findBySeekerId(id);
  }

  @Post()
  async addToWatchlist(@Body() dto: CreateWatchlistDto) {
    return this.watchlistService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromWatchlist(@Param('id') id: string) {
    await this.watchlistService.remove(id);
  }
}
