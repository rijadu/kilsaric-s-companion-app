import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';
import { CreateGoodsReceiptDto } from './dto/goods-receipt.dto';
import { CreateInventoryCountDto } from './dto/inventory-count.dto';

type Tx = Prisma.TransactionClient;

type LotConsumption = {
  inventoryLotId: string;
  quantity: number;
  unitCost: number;
  receivedAt: Date;
};

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  getChanges() {
    return this.prisma.stockChange.findMany({ orderBy: { date: 'desc' } });
  }

  async applyCorrection(dto: StockCorrectionDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    return this.prisma.$transaction(async (tx) => {
      const previousStock = product.stock;
      const newStock = Math.max(0, previousStock + dto.quantity);

      if (dto.quantity > 0) {
        await this.createAdjustmentLot(tx, {
          productId: dto.productId,
          quantity: dto.quantity,
          unitCost: product.costPrice,
          sourceType: 'correction',
        });
      } else if (dto.quantity < 0) {
        await this.consumeLots(tx, dto.productId, Math.abs(dto.quantity));
      }

      await tx.product.update({ where: { id: dto.productId }, data: { stock: newStock } });
      await this.syncProductCostPrice(tx, dto.productId);

      return tx.stockChange.create({
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
    });
  }

  getReceipts() {
    return this.prisma.goodsReceipt.findMany({
      include: {
        items: {
          include: {
            inventoryLots: {
              orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
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
              sellingPrice: i.sellingPrice,
              unit: i.unit,
            })),
          },
        },
        include: { items: true },
      });

      for (const receiptItem of receipt.items) {
        const dtoItem = dto.items.find((item) => item.productId === receiptItem.productId);
        if (!dtoItem) continue;

        const product = await tx.product.findUnique({ where: { id: receiptItem.productId } });
        if (!product) throw new NotFoundException(`Product ${receiptItem.productId} not found`);

        const previousStock = product.stock;
        const newStock = previousStock + receiptItem.quantity;

        await tx.inventoryLot.create({
          data: {
            productId: receiptItem.productId,
            receiptItemId: receiptItem.id,
            sourceType: 'receipt',
            unitCost: receiptItem.costPrice,
            receivedQty: receiptItem.quantity,
            remainingQty: receiptItem.quantity,
            receivedAt: now,
          },
        });

        await tx.product.update({
          where: { id: receiptItem.productId },
          data: { stock: newStock, sellingPrice: dtoItem.sellingPrice },
        });
        await this.syncProductCostPrice(tx, receiptItem.productId);

        await tx.stockChange.create({
          data: {
            productId: receiptItem.productId,
            productName: receiptItem.productName,
            type: 'receipt',
            quantity: receiptItem.quantity,
            previousStock,
            newStock,
            note: `Primka ${receipt.id} · ${dto.supplierName} · Lot ${receiptItem.quantity} x ${receiptItem.costPrice.toFixed(2)}`,
            date: now,
          },
        });
      }

      return tx.goodsReceipt.findUniqueOrThrow({
        where: { id: receipt.id },
        include: {
          items: {
            include: {
              inventoryLots: {
                orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
              },
            },
          },
        },
      });
    });
  }

  async updateReceipt(id: string, dto: CreateGoodsReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              inventoryLots: {
                include: {
                  saleAllocations: {
                    include: {
                      saleItem: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!receipt) throw new NotFoundException(`Receipt ${id} not found`);

      const duplicateProductIds = dto.items
        .map((item) => item.productId)
        .filter((productId, index, list) => list.indexOf(productId) !== index);
      if (duplicateProductIds.length > 0) {
        throw new BadRequestException('Duplicate products are not allowed on a goods receipt.');
      }

      const existingByProductId = new Map(receipt.items.map((item) => [item.productId, item]));
      const requestedByProductId = new Map(dto.items.map((item) => [item.productId, item]));
      const touchedProductIds = new Set<string>([
        ...existingByProductId.keys(),
        ...requestedByProductId.keys(),
      ]);
      const affectedSaleItemIds = new Set<string>();
      for (const existingItem of receipt.items) {
        const lot = existingItem.inventoryLots[0];
        const consumedQty = lot
          ? lot.receivedQty - lot.remainingQty
          : 0;
        const requestedItem = requestedByProductId.get(existingItem.productId);

        if (!requestedItem) {
          if (consumedQty > 0) {
            throw new BadRequestException(
              `Cannot remove ${existingItem.productName}; ${consumedQty} units were already consumed by FIFO sales.`,
            );
          }

          const product = await tx.product.findUnique({ where: { id: existingItem.productId } });
          if (!product) throw new NotFoundException(`Product ${existingItem.productId} not found`);

          await tx.goodsReceiptItem.delete({ where: { id: existingItem.id } });
          await tx.product.update({
            where: { id: existingItem.productId },
            data: { stock: Math.max(0, product.stock - existingItem.quantity) },
          });
          await this.syncProductCostPrice(tx, existingItem.productId);
          await tx.stockChange.create({
            data: {
              productId: existingItem.productId,
              productName: existingItem.productName,
              type: 'correction',
              quantity: -existingItem.quantity,
              previousStock: product.stock,
              newStock: Math.max(0, product.stock - existingItem.quantity),
              note: `Izmena primke ${receipt.id} · uklonjena stavka`,
            },
          });
          continue;
        }

        if (requestedItem.quantity < consumedQty) {
          throw new BadRequestException(
            `Cannot reduce ${existingItem.productName} below ${consumedQty}; that quantity is already consumed by FIFO sales.`,
          );
        }

        const quantityDelta = requestedItem.quantity - existingItem.quantity;
        const lotId = lot?.id;

        if (quantityDelta > 0) {
          const laterSalesExist = await tx.saleItem.count({
            where: {
              productId: existingItem.productId,
              sale: { status: 'completed', date: { gt: receipt.date } },
            },
          });
          if (laterSalesExist > 0) {
            throw new BadRequestException(
              `Cannot increase historical quantity for ${existingItem.productName} because later sales already exist and would require FIFO reallocation.`,
            );
          }
        }

        await tx.goodsReceiptItem.update({
          where: { id: existingItem.id },
          data: {
            productName: requestedItem.productName,
            quantity: requestedItem.quantity,
            costPrice: requestedItem.costPrice,
            sellingPrice: requestedItem.sellingPrice,
            unit: requestedItem.unit,
          },
        });

        if (lotId) {
          await tx.inventoryLot.update({
            where: { id: lotId },
            data: {
              unitCost: requestedItem.costPrice,
              receivedQty: requestedItem.quantity,
              remainingQty: requestedItem.quantity - consumedQty,
            },
          });

          const lotAllocations = await tx.saleItemLotAllocation.findMany({
            where: { inventoryLotId: lotId },
          });
          if (lotAllocations.length > 0) {
            await tx.saleItemLotAllocation.updateMany({
              where: { inventoryLotId: lotId },
              data: { unitCost: requestedItem.costPrice },
            });
            lotAllocations.forEach((allocation) => affectedSaleItemIds.add(allocation.saleItemId));
          }
        }

        const product = await tx.product.findUnique({ where: { id: existingItem.productId } });
        if (!product) throw new NotFoundException(`Product ${existingItem.productId} not found`);

        await tx.product.update({
          where: { id: existingItem.productId },
          data: {
            stock: Math.max(0, product.stock + quantityDelta),
          },
        });
        await this.syncProductCostPrice(tx, existingItem.productId);
        if (quantityDelta !== 0) {
          await tx.stockChange.create({
            data: {
              productId: existingItem.productId,
              productName: existingItem.productName,
              type: 'correction',
              quantity: quantityDelta,
              previousStock: product.stock,
              newStock: Math.max(0, product.stock + quantityDelta),
              note: `Izmena primke ${receipt.id} · korekcija količine`,
            },
          });
        }
      }

      for (const requestedItem of dto.items) {
        if (existingByProductId.has(requestedItem.productId)) continue;

        const laterSalesExist = await tx.saleItem.count({
          where: {
            productId: requestedItem.productId,
            sale: { status: 'completed', date: { gt: receipt.date } },
          },
        });
        if (laterSalesExist > 0) {
          throw new BadRequestException(
            `Cannot add a new historical receipt line for ${requestedItem.productName} because later sales already exist and would require FIFO reallocation.`,
          );
        }

        const createdItem = await tx.goodsReceiptItem.create({
          data: {
            receiptId: receipt.id,
            productId: requestedItem.productId,
            productName: requestedItem.productName,
            quantity: requestedItem.quantity,
            costPrice: requestedItem.costPrice,
            sellingPrice: requestedItem.sellingPrice,
            unit: requestedItem.unit,
          },
        });

        await tx.inventoryLot.create({
          data: {
            productId: requestedItem.productId,
            receiptItemId: createdItem.id,
            sourceType: 'receipt',
            unitCost: requestedItem.costPrice,
            receivedQty: requestedItem.quantity,
            remainingQty: requestedItem.quantity,
            receivedAt: receipt.date,
          },
        });

        const product = await tx.product.findUnique({ where: { id: requestedItem.productId } });
        if (!product) throw new NotFoundException(`Product ${requestedItem.productId} not found`);

        await tx.product.update({
          where: { id: requestedItem.productId },
          data: {
            stock: product.stock + requestedItem.quantity,
            sellingPrice: product.sellingPrice,
          },
        });
        await this.syncProductCostPrice(tx, requestedItem.productId);
        await tx.stockChange.create({
          data: {
            productId: requestedItem.productId,
            productName: requestedItem.productName,
            type: 'correction',
            quantity: requestedItem.quantity,
            previousStock: product.stock,
            newStock: product.stock + requestedItem.quantity,
            note: `Izmena primke ${receipt.id} · dodata stavka`,
          },
        });
      }

      for (const saleItemId of affectedSaleItemIds) {
        await this.recalculateSaleItemCost(tx, saleItemId);
      }

      for (const productId of touchedProductIds) {
        await this.syncProductCostPrice(tx, productId);
      }

      const totalCost = dto.items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
      await tx.goodsReceipt.update({
        where: { id },
        data: {
          supplierId: dto.supplierId ?? receipt.supplierId ?? null,
          supplierName: dto.supplierName,
          note: dto.note ?? null,
          totalCost,
        },
      });

      return tx.goodsReceipt.findUniqueOrThrow({
        where: { id },
        include: {
          items: {
            include: {
              inventoryLots: {
                orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
              },
            },
          },
        },
      });
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
        if (item.difference === 0) continue;

        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        if (item.difference > 0) {
          await this.createAdjustmentLot(tx, {
            productId: item.productId,
            quantity: item.difference,
            unitCost: product.costPrice,
            sourceType: 'inventory',
          });
        } else {
          await this.consumeLots(tx, item.productId, Math.abs(item.difference));
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.actualStock },
        });
        await this.syncProductCostPrice(tx, item.productId);
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

      return count;
    });
  }

  private async consumeLots(tx: Tx, productId: string, quantity: number) {
    const lots = await tx.inventoryLot.findMany({
      where: { productId, remainingQty: { gt: 0 } },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    });

    let remaining = quantity;
    const consumptions: LotConsumption[] = [];

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
        receivedAt: lot.receivedAt,
      });
      remaining -= used;
    }

    if (remaining > 0) {
      throw new BadRequestException(`Insufficient FIFO lots for product ${productId}`);
    }

    return consumptions;
  }

  private async createAdjustmentLot(
    tx: Tx,
    input: { productId: string; quantity: number; unitCost: number; sourceType: 'correction' | 'inventory' },
  ) {
    if (input.quantity <= 0) return null;

    return tx.inventoryLot.create({
      data: {
        productId: input.productId,
        sourceType: input.sourceType,
        unitCost: input.unitCost,
        receivedQty: input.quantity,
        remainingQty: input.quantity,
      },
    });
  }

  private async recalculateSaleItemCost(tx: Tx, saleItemId: string) {
    const allocations = await tx.saleItemLotAllocation.findMany({
      where: { saleItemId },
    });
    const costPrice = StockService.inferCostPrice(allocations);
    await tx.saleItem.update({
      where: { id: saleItemId },
      data: { costPrice },
    });
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

  static buildLotNote(prefix: string, consumptions: Array<{ quantity: number; unitCost: number }>) {
    if (consumptions.length === 0) return prefix;
    const parts = consumptions.map((item) => `${item.quantity} x ${item.unitCost.toFixed(2)}`);
    return `${prefix} · FIFO ${parts.join(', ')}`;
  }

  static inferCostPrice(consumptions: Array<{ quantity: number; unitCost: number }>) {
    const totalQty = consumptions.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQty === 0) return 0;
    const totalCost = consumptions.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    return totalCost / totalQty;
  }
}
