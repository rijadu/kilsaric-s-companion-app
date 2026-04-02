import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { getItemTotal, Sale } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

type DateFilter = 'today' | 'week' | 'all';

@Component({
  selector: 'app-sales-history-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sales-history-page.component.html',
  styleUrl: './sales-history-page.component.css',
})
export class SalesHistoryPageComponent {
  private readonly store = inject(MockStoreService);

  protected readonly refundingId = signal<string | null>(null);
  protected readonly refundReason = signal('');
  protected readonly pageMessage = signal<string | null>(null);
  protected readonly sales = this.store.sales;
  protected readonly searchQuery = signal('');
  protected readonly dateFilter = signal<DateFilter>('all');

  protected readonly filteredSales = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.dateFilter();
    const now = new Date();

    return this.sales().filter((sale: Sale) => {
      const d = new Date(sale.date);
      if (filter === 'today' && d.toDateString() !== now.toDateString()) return false;
      if (filter === 'week') {
        const week = new Date(now);
        week.setDate(week.getDate() - 7);
        if (d < week) return false;
      }
      if (!query) return true;
      const inItems = sale.items.some(i => i.product.name.toLowerCase().includes(query));
      const inCustomer = sale.customerName?.toLowerCase().includes(query) ?? false;
      return inItems || inCustomer;
    });
  });

  protected updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  protected setDateFilter(filter: DateFilter): void {
    this.dateFilter.set(filter);
  }

  protected startRefund(saleId: string): void {
    this.refundingId.set(saleId);
    this.refundReason.set('');
    this.pageMessage.set(null);
  }

  protected cancelRefund(): void {
    this.refundingId.set(null);
    this.refundReason.set('');
  }

  protected async confirmRefund(saleId: string): Promise<void> {
    const reason = this.refundReason().trim() || 'Bez razloga';
    const result = await this.store.refundSale(saleId, reason);
    if (!result) {
      this.pageMessage.set('Prodaja nije dostupna za storno.');
      return;
    }

    this.pageMessage.set(
      `Prodaja je stornirana. Vraceno artikala: ${result.restoredItems}.`,
    );
    this.cancelRefund();
  }

  protected updateRefundReason(value: string): void {
    this.refundReason.set(value);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected formatDate(value: string, includeYear = true): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      ...(includeYear ? { year: 'numeric' as const } : {}),
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected paymentLabel(method: 'cash' | 'card'): string {
    return method === 'cash' ? 'Gotovina' : 'Kartica';
  }

  protected getItemTotal = getItemTotal;
}
