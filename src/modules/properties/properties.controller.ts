import { Controller, Get, Post, Delete, Body, Param, NotFoundException, ForbiddenException, Query, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('listings')
@Controller('listings')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach image URLs to a listing' })
  async addMedia(@Param('id') id: string, @Request() req: AuthenticatedRequest, @Body() body: { urls: string[] }) {
    const property = await this.propertiesService.findOne(id);
    if (!property) throw new NotFoundException(`Properti dengan ID ${id} tidak ditemukan`);
    if ((property as any).ownerId !== req.user.id) throw new NotFoundException('Bukan properti Anda');
    return this.propertiesService.addMedia(id, body.urls);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property listing' })
  async create(@Request() req: AuthenticatedRequest, @Body() createPropertyDto: CreatePropertyDto) {
    // req.user is the full user object from JwtStrategy.validate (has .id)
    return this.propertiesService.create(req.user.id, createPropertyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated and filtered property listings' })
  @ApiResponse({ status: 200, description: 'Return paginated properties.' })
  async findAll(@Query() query: QueryPropertyDto) {
    return this.propertiesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed property by ID' })
  async findOne(@Param('id') id: string) {
    const property = await this.propertiesService.findOne(id);
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return property;
  }
  
  @Get(':id/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rooms for a property' })
  async findRooms(@Param('id') id: string) {
    return this.propertiesService.findRoomsByPropertyId(id);
  }

  @Post(':id/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add rooms to a property (owner only)' })
  async addRooms(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { count: number; priceMonthly: number },
  ) {
    const property = await this.propertiesService.findOne(id);
    if (!property) throw new NotFoundException(`Properti dengan ID ${id} tidak ditemukan`);
    if ((property as any).ownerId !== req.user.id) throw new ForbiddenException('Bukan properti Anda');
    return this.propertiesService.addRooms(id, body.count, body.priceMonthly);
  }

  @Delete(':id/rooms/:roomId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a room from a property (owner only)' })
  async deleteRoom(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const property = await this.propertiesService.findOne(id);
    if (!property) throw new NotFoundException(`Properti dengan ID ${id} tidak ditemukan`);
    if ((property as any).ownerId !== req.user.id) throw new ForbiddenException('Bukan properti Anda');
    return this.propertiesService.deleteRoom(id, roomId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a property (owner only)' })
  async deleteProperty(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.propertiesService.deleteProperty(id, req.user.id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk delete properties (owner only)' })
  async deletePropertiesBulk(@Body() body: { ids: string[] }, @Request() req: AuthenticatedRequest) {
    return this.propertiesService.deletePropertiesBulk(body.ids, req.user.id);
  }
}
