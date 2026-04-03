import { FormsModule } from '@angular/forms';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GoodsReceipt } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';
import { SnackbarService } from '../../shared/snackbar.service';

@Component({
  selector: 'app-goods-receipt-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './goods-receipt-page.component.html',
  styleUrl: './goods-receipt-page.component.css',
})
export class GoodsReceiptPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly receipts = this.store.goodsReceipts;
  protected readonly expandedReceiptId = signal<string | null>(null);
  protected readonly historySearch = signal('');
  protected readonly dateFilter = signal<'today' | 'week' | 'month' | 'all'>('all');
  protected readonly visibleCount = signal(15);

  protected readonly dateFilters: { key: 'today' | 'week' | 'month' | 'all'; label: string }[] = [
    { key: 'today', label: 'Danas' },
    { key: 'week', label: 'Nedelja' },
    { key: 'month', label: 'Mesec' },
    { key: 'all', label: 'Sve' },
  ];

  protected readonly unitLabels: Record<string, string> = {
    piece: 'kom',
    kg: 'kg',
    meter: 'm',
    liter: 'L',
    box: 'kutija',
  };

  constructor() {
    effect(() => {
      const saved = this.queryParams().get('saved');
      if (!saved) return;
      if (saved === 'created') this.snackbar.success('Prijem robe je evidentiran.');
      if (saved === 'updated') this.snackbar.success('Prijem robe je izmenjen.');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { saved: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  protected readonly filteredReceipts = computed(() => {
    const query = this.historySearch().trim().toLowerCase();
    const filter = this.dateFilter();
    const now = new Date();

    return this.receipts().filter((receipt) => {
      if (query) {
        const matchesSupplier = receipt.supplier.toLowerCase().includes(query);
        const matchesProduct = receipt.items.some((item) =>
          item.productName.toLowerCase().includes(query),
        );
        if (!matchesSupplier && !matchesProduct) return false;
      }
      if (filter !== 'all') {
        const date = new Date(receipt.date);
        if (filter === 'today') {
          if (date.toDateString() !== now.toDateString()) return false;
        } else if (filter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          if (date < weekAgo) return false;
        } else if (filter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          if (date < monthAgo) return false;
        }
      }
      return true;
    });
  });

  protected readonly groupedReceipts = computed(() => {
    const visible = this.filteredReceipts().slice(0, this.visibleCount());
    const groups = new Map<string, GoodsReceipt[]>();
    for (const receipt of visible) {
      const day = new Date(receipt.date).toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(receipt);
    }
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  });

  protected readonly hasMore = computed(
    () => this.filteredReceipts().length > this.visibleCount(),
  );

  protected setDateFilter(filter: 'today' | 'week' | 'month' | 'all'): void {
    this.dateFilter.set(filter);
    this.visibleCount.set(15);
  }

  protected loadMore(): void {
    this.visibleCount.update((n) => n + 15);
  }

  protected toggleExpanded(id: string): void {
    this.expandedReceiptId.update((current) => (current === id ? null : id));
  }

  protected editReceipt(id: string): void {
    void this.router.navigate(['/goods-receipt/edit', id]);
  }

  protected updateHistorySearch(value: string): void {
    this.historySearch.set(value);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
