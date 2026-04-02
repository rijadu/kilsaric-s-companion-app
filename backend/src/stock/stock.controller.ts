import { Controller, Get, Post, Body } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';
import { CreateGoodsReceiptDto } from './dto/goods-receipt.dto';
import { CreateInventoryCountDto } from './dto/inventory-count.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('changes')
  getChanges() {
    return this.service.getChanges();
  }

  @Post('correction')
  applyCorrection(@Body() dto: StockCorrectionDto) {
    return this.service.applyCorrection(dto);
  }

  @Get('receipts')
  getReceipts() {
    return this.service.getReceipts();
  }

  @Post('receipts')
  createReceipt(@Body() dto: CreateGoodsReceiptDto) {
    return this.service.createReceipt(dto);
  }

  @Get('inventory-counts')
  getInventoryCounts() {
    return this.service.getInventoryCounts();
  }

  @Post('inventory-counts')
  createInventoryCount(@Body() dto: CreateInventoryCountDto) {
    return this.service.createInventoryCount(dto);
  }
}
