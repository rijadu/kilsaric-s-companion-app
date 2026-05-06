import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type Tx = Prisma.TransactionClient;

const productInclude = {
  inventoryLots: {
    where: { remainingQty: { gt: 0 } },
    orderBy: [{ receivedAt: 'asc' as const }, { id: 'asc' as const }],
    include: {
      receiptItem: {
        include: { receipt: true },
      },
    },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      where: { status: 'active' },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  findByCode(query: string) {
    const normalized = query.toLowerCase();
    return this.prisma.product.findFirst({
      where: {
        OR: [
          { barcode: { contains: query } },
          { sku: { contains: normalized, mode: 'insensitive' } },
          { name: { contains: normalized, mode: 'insensitive' } },
        ],
      },
      include: productInclude,
    });
  }

  async getLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: 'active' },
      include: productInclude,
    });
    return products.filter((p) => p.stock <= p.lowStockThreshold);
  }

  async create(dto: CreateProductDto) {
    const { expiryDate, ...rest } = dto;
    const initialStock = rest.stock ?? 0;
    const name = this.normalizeName(rest.name);

    if (name) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          status: 'active',
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException('Proizvod sa istim nazivom već postoji.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          sku: rest.sku || `SKU-${randomUUID().slice(0, 8).toUpperCase()}`,
          barcode: rest.barcode || randomUUID().replace(/-/g, '').slice(0, 13),
          category: rest.category ?? '',
          subcategory: rest.subcategory,
          brand: rest.brand ?? '',
          description: rest.description ?? '',
          costPrice: rest.costPrice ?? 0,
          sellingPrice: rest.sellingPrice ?? 0,
          bulkPrice: rest.bulkPrice,
          bulkMinQty: rest.bulkMinQty,
          unit: rest.unit ?? 'piece',
          packSize: rest.packSize,
          stock: initialStock,
          lowStockThreshold: rest.lowStockThreshold ?? 0,
          status: 'active',
          image: rest.image,
          warrantyMonths: rest.warrantyMonths,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryLot.create({
          data: {
            productId: product.id,
            sourceType: 'initial',
            unitCost: product.costPrice,
            receivedQty: initialStock,
            remainingQty: initialStock,
          },
        });
        await tx.stockChange.create({
          data: {
            productId: product.id,
            productName: product.name,
            type: 'correction',
            quantity: initialStock,
            previousStock: 0,
            newStock: initialStock,
            note: 'Početno stanje pri kreiranju proizvoda',
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: productInclude,
      });
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);
    const { expiryDate, stock, costPrice, ...rest } = dto;
    const name = rest.name === undefined ? undefined : this.normalizeName(rest.name);

    if (name) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
          status: 'active',
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException('Proizvod sa istim nazivom već postoji.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const desiredStock = stock ?? existing.stock;
      const delta = desiredStock - existing.stock;

      if (delta > 0) {
        await tx.inventoryLot.create({
          data: {
            productId: id,
            sourceType: 'correction',
            unitCost: costPrice ?? existing.costPrice,
            receivedQty: delta,
            remainingQty: delta,
          },
        });
      } else if (delta < 0) {
        await this.consumeLots(tx, id, Math.abs(delta));
      }

      await tx.product.update({
        where: { id },
        data: {
          ...rest,
          name,
          costPrice:
            desiredStock === 0 && typeof costPrice === 'number'
              ? costPrice
              : undefined,
          stock: desiredStock,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        },
      });

      if (delta !== 0) {
        await tx.stockChange.create({
          data: {
            productId: id,
            productName: existing.name,
            type: 'correction',
            quantity: delta,
            previousStock: existing.stock,
            newStock: desiredStock,
            note: 'Izmena proizvoda',
          },
        });
        await this.syncProductCostPrice(tx, id);
      } else if (desiredStock === 0 && typeof costPrice === 'number') {
        await tx.product.update({
          where: { id },
          data: { costPrice },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  private async consumeLots(tx: Tx, productId: string, quantity: number) {
    const lots = await tx.inventoryLot.findMany({
      where: { productId, remainingQty: { gt: 0 } },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    });

    let remaining = quantity;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const used = Math.min(lot.remainingQty, remaining);
      if (used <= 0) continue;

      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: { remainingQty: lot.remainingQty - used },
      });
      remaining -= used;
    }

    if (remaining > 0) {
      throw new BadRequestException(`Insufficient FIFO lots for product ${productId}`);
    }
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

  private normalizeName(name?: string) {
    return name?.trim().replace(/\s+/g, ' ') ?? '';
  }
}
