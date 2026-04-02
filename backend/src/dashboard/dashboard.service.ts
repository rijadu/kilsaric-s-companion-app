import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Period = 'today' | 'week' | 'month';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(period: Period) {
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

    const [totalProducts, stockAggregate, sales] = await Promise.all([
      this.prisma.product.count({ where: { status: 'active' } }),
      this.prisma.product.aggregate({ _sum: { stock: true } }),
      this.prisma.sale.findMany({
        where: { status: 'completed', date: { gte: periodStart } },
        include: { items: true },
      }),
    ]);

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = sales.reduce(
      (sum, s) =>
        sum + s.items.reduce((iSum, i) => iSum + (i.sellingPrice - i.costPrice) * i.quantity, 0),
      0,
    );
    const cashTotal = sales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + s.total, 0);
    const cardTotal = sales
      .filter((s) => s.paymentMethod === 'card')
      .reduce((sum, s) => sum + s.total, 0);
    const soldItems = sales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
      0,
    );

    return {
      period,
      totalProducts,
      totalItemsInStock: stockAggregate._sum.stock ?? 0,
      salesCount: sales.length,
      totalRevenue,
      totalProfit,
      cashTotal,
      cardTotal,
      soldItems,
      averageReceipt: sales.length ? totalRevenue / sales.length : 0,
    };
  }
}
