import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }

  async getStats(customerId: string) {
    await this.findOne(customerId);
    const sales = await this.prisma.sale.findMany({
      where: { customerId },
      include: { items: true },
    });
    const completed = sales.filter((s) => s.status === 'completed');
    const totalSpent = completed.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = completed.reduce(
      (sum, s) =>
        sum + s.items.reduce((iSum, i) => iSum + (i.sellingPrice - i.costPrice) * i.quantity, 0),
      0,
    );
    return { salesCount: completed.length, totalSpent, totalProfit, sales };
  }
}
