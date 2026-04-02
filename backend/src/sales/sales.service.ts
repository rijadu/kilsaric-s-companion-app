import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';

type Period = 'today' | 'week' | 'month';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(period?: Period) {
    if (!period) {
      return this.prisma.sale.findMany({
        include: { items: true },
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
      include: { items: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });
    if (!sale) throw new NotFoundException(`Sale ${id} not found`);
    return sale;
  }

  async create(dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
        if (item.quantity > product.stock) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }
      }

      const saleItemsData = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const variant = item.variantId
          ? product.variants.find((v) => v.id === item.variantId)
          : null;
        const basePrice = variant?.priceOverride ?? product.sellingPrice;
        const baseTotal = basePrice * item.quantity;
        let lineTotal = baseTotal;
        if (item.discountType === 'percent' && item.discountValue) {
          lineTotal = baseTotal * (1 - item.discountValue / 100);
        } else if (item.discountType === 'fixed' && item.discountValue) {
          lineTotal = Math.max(0, baseTotal - item.discountValue);
        }
        return {
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          costPrice: product.costPrice,
          sellingPrice: basePrice,
          unit: product.unit,
          variantId: item.variantId ?? null,
          variantName: variant?.name ?? null,
          quantity: item.quantity,
          discountType: item.discountType ?? null,
          discountValue: item.discountValue ?? null,
          lineTotal,
        };
      });

      const subtotal = saleItemsData.reduce((sum, i) => sum + i.lineTotal, 0);
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
          items: { create: saleItemsData },
        },
        include: { items: true },
      });

      const now = new Date();
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const newStock = product.stock - item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
        await tx.stockChange.create({
          data: {
            productId: item.productId,
            productName: product.name,
            type: 'sale',
            quantity: -item.quantity,
            previousStock: product.stock,
            newStock,
            note: `Prodaja ${sale.id}`,
            date: now,
          },
        });
      }

      return sale;
    });
  }

  async refund(id: string, dto: RefundSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!sale) throw new NotFoundException(`Sale ${id} not found`);
      if (sale.status === 'refunded') throw new BadRequestException('Sale already refunded');

      const now = new Date();
      for (const item of sale.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newStock = product.stock + item.quantity;
          await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
          await tx.stockChange.create({
            data: {
              productId: item.productId,
              productName: item.productName,
              type: 'refund',
              quantity: item.quantity,
              previousStock: product.stock,
              newStock,
              note: `Storno prodaje ${id}: ${dto.reason}`,
              date: now,
            },
          });
        }
      }

      return tx.sale.update({
        where: { id },
        data: { status: 'refunded', refundDate: now, refundReason: dto.reason },
        include: { items: true },
      });
    });
  }
}
