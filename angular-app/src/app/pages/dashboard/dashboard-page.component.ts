import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DashboardPeriod,
  DashboardStatCard,
  MockStoreService,
} from '../../shared/mock-store.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly dashboardSummaryByPeriod = this.store.dashboardSummaryByPeriod;
  private readonly dashboardCardsByPeriod = this.store.dashboardCardsByPeriod;
  private readonly salesByPeriod = this.store.salesByPeriod;
  private readonly lowStockProducts = this.store.lowStockProducts;
  private readonly saleItemsLabelById = this.store.saleItemsLabelById;

  protected readonly period = signal<DashboardPeriod>('today');
  protected readonly summary = computed(() =>
    this.dashboardSummaryByPeriod()[this.period()],
  );
  protected readonly cards = computed<DashboardStatCard[]>(() =>
    this.dashboardCardsByPeriod()[this.period()],
  );
  protected readonly recentSales = computed(() =>
    this.salesByPeriod()[this.period()].slice(0, 5),
  );
  protected readonly lowStockItems = computed(() =>
    this.lowStockProducts().slice(0, 4),
  );
  protected readonly lowStockCount = computed(() =>
    this.lowStockProducts().length,
  );
  protected readonly notificationCount = computed(() =>
    this.lowStockCount() > 0 ? 1 : 0,
  );
  protected readonly periods: { key: DashboardPeriod; label: string }[] = [
    { key: 'today', label: 'Danas' },
    { key: 'week', label: 'Ova nedelja' },
    { key: 'month', label: 'Ovaj mesec' },
  ];

  protected setPeriod(period: DashboardPeriod): void {
    this.period.set(period);
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected saleItemsLabel(saleId: string): string {
    return this.saleItemsLabelById()[saleId] ?? '';
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected cardIcon(card: DashboardStatCard): 'package' | 'cash' | 'profit' | 'cart' {
    if (card.route === '/products') {
      return 'package';
    }

    if (card.route === '/history') {
      return 'cash';
    }

    if (card.route === '/reports') {
      return 'profit';
    }

    return 'cart';
  }
}
