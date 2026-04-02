import { Location } from '@angular/common';
import { Component, computed, signal, inject } from '@angular/core';
import { StockChangeType } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

type StockFilter = StockChangeType | 'all';

@Component({
  selector: 'app-stock-history-page',
  standalone: true,
  templateUrl: './stock-history-page.component.html',
  styleUrl: './stock-history-page.component.css',
})
export class StockHistoryPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly location = inject(Location);
  private readonly stockChanges = this.store.stockChanges;

  protected readonly filter = signal<StockFilter>('all');
  protected readonly filterOptions: StockFilter[] = [
    'all',
    'sale',
    'receipt',
    'correction',
    'refund',
    'inventory',
  ];

  protected readonly filteredChanges = computed(() => {
    const filter = this.filter();
    const changes = this.stockChanges();
    return filter === 'all'
      ? changes
      : changes.filter((change) => change.type === filter);
  });

  protected readonly typeLabels: Record<StockChangeType, string> = {
    sale: 'Prodaja',
    receipt: 'Prijem',
    correction: 'Korekcija',
    refund: 'Povrat',
    inventory: 'Popis',
  };

  protected setFilter(filter: StockFilter): void {
    this.filter.set(filter);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected quantityClass(value: number): string {
    return value > 0 ? 'stock-change__qty stock-change__qty--positive' : 'stock-change__qty stock-change__qty--negative';
  }

  protected iconClass(type: StockChangeType): string {
    return `stock-change__icon stock-change__icon--${type}`;
  }
}
