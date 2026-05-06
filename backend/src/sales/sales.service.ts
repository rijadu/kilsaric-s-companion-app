import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { StockService } from '../stock/stock.service';

type Period = 'today' | 'week' | 'month';
type Tx = Prisma.TransactionClient;

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(period?: Period) {
    if (!period) {
      return this.prisma.sale.findMany({
        include: {
          items: {
            include: { lotAllocations: true },
          },
        },
        orderBy: { date: 'desc' },
      });
    }

    const now = new Date();
    let periodStart: Date;
    if (period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
    } else {
      periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 1);
    }

    return this.prisma.sale.findMany({
      where: { date: { gte: periodStart } },
      include: {
        items: {
          include: { lotAllocations: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: { lotAllocations: true },
        },
        customer: true,
      },
    });
    if (!sale) throw new NotFoundException(`Sale ${id} not found`);
    return sale;
  }

  async create(dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const requestedQtyByProduct = new Map<string, number>();
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
        const requestedQty = (requestedQtyByProduct.get(item.productId) ?? 0) + item.quantity;
        requestedQtyByProduct.set(item.productId, requestedQty);
        if (requestedQty > product.stock) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }
      }

      const provisionalItems: Array<{
        input: CreateSaleDto['items'][number];
        product: (typeof products)[number];
        basePrice: number;
        lineTotal: number;
        costPrice: number;
        consumptions: Array<{ inventoryLotId: string; quantity: number; unitCost: number }>;
      }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const basePrice = product.sellingPrice;
        const baseTotal = basePrice * item.quantity;
        let lineTotal = baseTotal;
        if (item.discountType === 'percent' && item.discountValue) {
          lineTotal = baseTotal * (1 - item.discountValue / 100);
        } else if (item.discountType === 'fixed' && item.discountValue) {
          lineTotal = Math.max(0, baseTotal - item.discountValue);
        }

        const consumptions = await this.consumeLots(tx, item.productId, item.quantity);
        const costPrice = StockService.inferCostPrice(consumptions);

        provisionalItems.push({
          input: item,
          product,
          basePrice,
          lineTotal,
          costPrice,
          consumptions,
        });
      }

      const subtotal = provisionalItems.reduce((sum, i) => sum + i.lineTotal, 0);
      let total = subtotal;
      if (dto.discountType === 'percent' && dto.discountValue) {
        total = subtotal * (1 - dto.discountValue / 100);
      } else if (dto.discountType === 'fixed' && dto.discountValue) {
        total = Math.max(0, subtotal - dto.discountValue);
      }

      const sale = await tx.sale.create({
        data: {
          subtotal,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          total,
          paymentMethod: dto.paymentMethod,
          customerId: dto.customerId ?? null,
          customerName: dto.customerName ?? null,
        },
      });

      const now = new Date();
      const currentStockByProduct = new Map(products.map((product) => [product.id, product.stock]));
      for (const item of provisionalItems) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.product.id,
            productName: item.product.name,
            productSku: item.product.sku,
            costPrice: item.costPrice,
            sellingPrice: item.basePrice,
            unit: item.product.unit,
            quantity: item.input.quantity,
            discountType: item.input.discountType ?? null,
            discountValue: item.input.discountValue ?? null,
            lineTotal: item.lineTotal,
          },
        });

        if (item.consumptions.length > 0) {
          await tx.saleItemLotAllocation.createMany({
            data: item.consumptions.map((consumption) => ({
              saleItemId: saleItem.id,
              inventoryLotId: consumption.inventoryLotId,
              quantity: consumption.quantity,
              unitCost: consumption.unitCost,
            })),
          });
        }

        const previousStock = currentStockByProduct.get(item.product.id) ?? item.product.stock;
        const newStock = previousStock - item.input.quantity;
        currentStockByProduct.set(item.product.id, newStock);
        await tx.product.update({ where: { id: item.product.id }, data: { stock: newStock } });
        await this.syncProductCostPrice(tx, item.product.id);
        await tx.stockChange.create({
          data: {
            productId: item.product.id,
            productName: item.product.name,
            type: 'sale',
            quantity: -item.input.quantity,
            previousStock,
            newStock,
            note: StockService.buildLotNote(`Prodaja ${sale.id}`, item.consumptions),
            date: now,
          },
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: {
          items: {
            include: { lotAllocations: true },
          },
        },
      });
    });
  }

  async refund(id: string, dto: RefundSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: { include: { lotAllocations: true } } },
      });
      if (!sale) throw new NotFoundException(`Sale ${id} not found`);
      if (sale.status === 'refunded') throw new BadRequestException('Sale already refunded');

      const now = new Date();
      for (const item of sale.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        for (const allocation of item.lotAllocations) {
          const lot = await tx.inventoryLot.findUnique({ where: { id: allocation.inventoryLotId } });
          if (!lot) continue;

          await tx.inventoryLot.update({
            where: { id: lot.id },
            data: { remainingQty: lot.remainingQty + allocation.quantity },
          });
        }

        const newStock = product.stock + item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
        await this.syncProductCostPrice(tx, item.productId);
        await tx.stockChange.create({
          data: {
            productId: item.productId,
            productName: item.productName,
            type: 'refund',
            quantity: item.quantity,
            previousStock: product.stock,
            newStock,
            note: StockService.buildLotNote(`Storno prodaje ${id}: ${dto.reason}`, item.lotAllocations),
            date: now,
          },
        });
      }

      return tx.sale.update({
        where: { id },
        data: { status: 'refunded', refundDate: now, refundReason: dto.reason },
        include: {
          items: {
            include: { lotAllocations: true },
          },
        },
      });
    });
  }

  private async consumeLots(tx: Tx, productId: string, quantity: number) {
    const lots = await tx.inventoryLot.findMany({
      where: { productId, remainingQty: { gt: 0 } },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    });

    let remaining = quantity;
    const consumptions: Array<{ inventoryLotId: string; quantity: number; unitCost: number }> = [];

    for (const lot of lots) {
      if (remaining <= 0) break;

      const used = Math.min(lot.remainingQty, remaining);
      if (used <= 0) continue;

      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: { remainingQty: lot.remainingQty - used },
      });

      consumptions.push({
        inventoryLotId: lot.id,
        quantity: used,
        unitCost: lot.unitCost,
      });
      remaining -= used;
    }

    if (remaining > 0) {
      throw new BadRequestException(`Insufficient FIFO lots for product ${productId}`);
    }

    return consumptions;
  }

  private async syncProductCostPrice(tx: Tx, productId: string) {
    const remainingLots = await tx.inventoryLot.findMany({
      where: { productId, remainingQty: { gt: 0 } },
    });

    if (remainingLots.length > 0) {
      const totalQty = remainingLots.reduce((sum, lot) => sum + lot.remainingQty, 0);
      const weightedCost =
        totalQty > 0
          ? remainingLots.reduce((sum, lot) => sum + lot.remainingQty * lot.unitCost, 0) / totalQty
          : 0;

      await tx.product.update({
        where: { id: productId },
        data: { costPrice: weightedCost },
      });
      return;
    }

    const latestLot = await tx.inventoryLot.findFirst({
      where: { productId },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });
    if (!latestLot) return;

    await tx.product.update({
      where: { id: productId },
      data: { costPrice: latestLot.unitCost },
    });
  }
}
