import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { getItemTotal, getProfit } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

interface SoldProductSummary {
  id: string;
  name: string;
  qty: number;
  revenue: number;
}

@Component({
  selector: 'app-daily-close-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './daily-close-page.component.html',
  styleUrl: './daily-close-page.component.css',
})
export class DailyClosePageComponent {
  private readonly store = inject(MockStoreService);
  private readonly sales = this.store.sales;

  protected readonly selectedDate = signal(
    new Date().toISOString().slice(0, 10),
  );

  protected readonly daySales = computed(() =>
    this.sales()
      .filter(
        (sale) => new Date(sale.date).toISOString().slice(0, 10) === this.selectedDate(),
      ),
  );

  protected readonly summary = computed(() => {
    const completed = this.daySales().filter((sale) => sale.status === 'completed');
    const refunded = this.daySales().filter((sale) => sale.status === 'refunded');
    const cashTotal = completed
      .filter((sale) => sale.paymentMethod === 'cash')
      .reduce((sum, sale) => sum + sale.total, 0);
    const cardTotal = completed
      .filter((sale) => sale.paymentMethod === 'card')
      .reduce((sum, sale) => sum + sale.total, 0);
    const totalRevenue = cashTotal + cardTotal;
    const totalProfit = completed.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + getProfit(item), 0),
      0,
    );
    const refundedTotal = refunded.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = completed.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    return {
      completed,
      refunded,
      cashTotal,
      cardTotal,
      totalRevenue,
      totalProfit,
      refundedTotal,
      totalItems,
      averageReceipt: completed.length ? totalRevenue / completed.length : 0,
    };
  });

  protected readonly soldProducts = computed<SoldProductSummary[]>(() => {
    const products: Record<string, SoldProductSummary> = {};

    this.summary().completed.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!products[item.product.id]) {
          products[item.product.id] = {
            id: item.product.id,
            name: item.product.name,
            qty: 0,
            revenue: 0,
          };
        }

        products[item.product.id].qty += item.quantity;
        products[item.product.id].revenue += getItemTotal(item);
      });
    });

    return Object.values(products).sort((left, right) => right.revenue - left.revenue);
  });

  protected updateDate(value: string): void {
    this.selectedDate.set(value);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected formatLongDate(value: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected print(): void {
    window.print();
  }
}
