import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
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
      include: { variants: true },
    });
  }

  async getLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: 'active' },
      include: { variants: true },
    });
    return products.filter((p) => p.stock <= p.lowStockThreshold);
  }

  async create(dto: CreateProductDto) {
    const { variants, expiryDate, ...rest } = dto;
    return this.prisma.product.create({
      data: {
        ...rest,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        variants: variants ? { create: variants } : undefined,
      },
      include: { variants: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { variants, expiryDate, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
      include: { variants: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}
