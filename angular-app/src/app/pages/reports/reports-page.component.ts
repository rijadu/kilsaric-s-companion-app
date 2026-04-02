import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { getItemTotal, getProfit, Product, Sale } from '../../shared/mock-data';
import {
  DashboardPeriod,
  MockStoreService,
} from '../../shared/mock-store.service';

interface ProductPerformance {
  id: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
}

interface ExpiringProduct {
  product: Product;
  daysLeft: number;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.css',
})
export class ReportsPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly location = inject(Location);
  private readonly allProducts = this.store.products;
  private readonly salesByPeriod = this.store.salesByPeriod;

  protected readonly period = signal<DashboardPeriod>('today');
  protected readonly periodOptions: { key: DashboardPeriod; label: string }[] = [
    { key: 'today', label: 'Danas' },
    { key: 'week', label: 'Ova nedelja' },
    { key: 'month', label: 'Ovaj mesec' },
  ];

  protected readonly filteredSales = computed(() =>
    this.salesByPeriod()[this.period()],
  );

  protected readonly totals = computed(() => {
    const sales = this.filteredSales();
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const profit = sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + getProfit(item), 0),
      0,
    );
    const avgSale = sales.length ? revenue / sales.length : 0;

    return {
      revenue,
      profit,
      totalSales: sales.length,
      avgSale,
    };
  });

  protected readonly topProducts = computed<ProductPerformance[]>(() => {
    const performance: Record<string, ProductPerformance> = {};

    this.filteredSales().forEach((sale: Sale) => {
      sale.items.forEach((item) => {
        if (!performance[item.product.id]) {
          performance[item.product.id] = {
            id: item.product.id,
            name: item.product.name,
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        }

        performance[item.product.id].qty += item.quantity;
        performance[item.product.id].revenue += getItemTotal(item);
        performance[item.product.id].profit += getProfit(item);
      });
    });

    return Object.values(performance)
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 5);
  });

  protected readonly lowStock = computed(() =>
    this.store
      .lowStockProducts()
      .sort(
        (left, right) =>
          left.stock / left.lowStockThreshold - right.stock / right.lowStockThreshold,
      )
      .slice(0, 5),
  );

  protected readonly expiringProducts = computed<ExpiringProduct[]>(() => {
    const now = new Date().getTime();

    return this.allProducts()
      .filter((product) => !!product.expiryDate)
      .map((product) => ({
        product,
        daysLeft: Math.ceil(
          (new Date(product.expiryDate!).getTime() - now) /
            (1000 * 60 * 60 * 24),
        ),
      }))
      .filter((entry) => entry.daysLeft > 0 && entry.daysLeft <= 30)
      .sort((left, right) => left.daysLeft - right.daysLeft);
  });

  protected setPeriod(period: DashboardPeriod): void {
    this.period.set(period);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }
}
