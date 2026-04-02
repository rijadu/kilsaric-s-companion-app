import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get()
  findAll(@Query('period') period?: 'today' | 'week' | 'month') {
    return this.service.findAll(period);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSaleDto) {
    return this.service.create(dto);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string, @Body() dto: RefundSaleDto) {
    return this.service.refund(id, dto);
  }
}
