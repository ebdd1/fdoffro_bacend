import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Seeker creates a rental order' })
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Orders where I am the seeker or the owner' })
  mine(@Request() req: any) {
    return this.ordersService.findMine(req.user.id);
  }

  @Patch(':id/accept')
  accept(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.accept(id, req.user.id);
  }

  @Patch(':id/reject')
  reject(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.reject(id, req.user.id);
  }

  @Patch(':id/submit-payment')
  @ApiOperation({ summary: 'Seeker submits transfer proof (transfer method only)' })
  submitPayment(@Request() req: any, @Param('id') id: string, @Body() dto: SubmitPaymentDto) {
    return this.ordersService.submitPayment(id, req.user.id, dto);
  }

  @Patch(':id/confirm-payment')
  @ApiOperation({ summary: 'Owner confirms payment (transfer after proof | COD after handover)' })
  confirmPayment(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.confirmPayment(id, req.user.id);
  }

  @Patch(':id/reject-payment')
  @ApiOperation({ summary: 'Owner rejects transfer proof — seeker must re-upload' })
  rejectPayment(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.rejectPayment(id, req.user.id);
  }

  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.cancel(id, req.user.id);
  }

  @Patch(':id/complete')
  complete(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.complete(id, req.user.id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'All rental orders (admin)' })
  all() {
    return this.ordersService.findAll();
  }
}
