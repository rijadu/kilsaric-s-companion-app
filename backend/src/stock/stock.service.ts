import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';
import { CreateGoodsReceiptDto } from './dto/goods-receipt.dto';
import { CreateInventoryCountDto } from './dto/inventory-count.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  getChanges() {
    return this.prisma.stockChange.findMany({ orderBy: { date: 'desc' } });
  }

  async applyCorrection(dto: StockCorrectionDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + dto.quantity);

    await this.prisma.product.update({ where: { id: dto.productId }, data: { stock: newStock } });

    return this.prisma.stockChange.create({
      data: {
        productId: dto.productId,
        productName: product.name,
        type: 'correction',
        quantity: dto.quantity,
        previousStock,
        newStock,
        note: dto.note,
      },
    });
  }

  getReceipts() {
    return this.prisma.goodsReceipt.findMany({
      include: { items: true },
      orderBy: { date: 'desc' },
    });
  }

  async createReceipt(dto: CreateGoodsReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const totalCost = dto.items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);
      const now = new Date();

      const receipt = await tx.goodsReceipt.create({
        data: {
          supplierId: dto.supplierId ?? null,
          supplierName: dto.supplierName,
          note: dto.note ?? null,
          totalCost,
          date: now,
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              costPrice: i.costPrice,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        const previousStock = product.stock;
        const newStock = previousStock + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock, costPrice: item.costPrice, sellingPrice: item.sellingPrice },
        });

        await tx.stockChange.create({
          data: {
            productId: item.productId,
            productName: item.productName,
            type: 'receipt',
            quantity: item.quantity,
            previousStock,
            newStock,
            note: `Primka ${receipt.id} · ${dto.supplierName}`,
            date: now,
          },
        });
      }

      return receipt;
    });
  }

  getInventoryCounts() {
    return this.prisma.inventoryCount.findMany({
      include: { items: true },
      orderBy: { date: 'desc' },
    });
  }

  async createInventoryCount(dto: CreateInventoryCountDto) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const count = await tx.inventoryCount.create({
        data: {
          date: now,
          status: 'completed',
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              systemStock: i.systemStock,
              actualStock: i.actualStock,
              difference: i.difference,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        if (item.difference !== 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: item.actualStock },
          });
          await tx.stockChange.create({
            data: {
              productId: item.productId,
              productName: item.productName,
              type: 'inventory',
              quantity: item.difference,
              previousStock: item.systemStock,
              newStock: item.actualStock,
              note: `Inventura ${count.id}`,
              date: now,
            },
          });
        }
      }

      return count;
    });
  }
}
