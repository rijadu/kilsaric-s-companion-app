import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { InventoryCount } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

@Component({
  selector: 'app-inventory-count-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inventory-count-page.component.html',
  styleUrl: './inventory-count-page.component.css',
})
export class InventoryCountPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly location = inject(Location);
  private readonly products = this.store.products;

  protected readonly activeCount = signal<InventoryCount | null>(null);
  protected readonly actualStocks = signal<Record<string, number>>({});
  protected readonly pageMessage = signal<string | null>(null);
  protected readonly counts = this.store.inventoryCounts;

  protected startNewCount(): void {
    const products = this.products();
    const stocks = products.reduce<Record<string, number>>((accumulator, product) => {
      accumulator[product.id] = product.stock;
      return accumulator;
    }, {});

    this.activeCount.set({
      id: `draft-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'in_progress',
      items: products.map((product) => ({
        productId: product.id,
        productName: product.name,
        systemStock: product.stock,
        actualStock: product.stock,
        difference: 0,
      })),
    });
    this.actualStocks.set(stocks);
    this.pageMessage.set(null);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected updateActualStock(productId: string, value: string): void {
    const parsed = Number.parseInt(value, 10);
    this.actualStocks.update((stocks) => ({
      ...stocks,
      [productId]: Number.isFinite(parsed) ? parsed : 0,
    }));
  }

  protected async finishCount(): Promise<void> {
    const activeCount = this.activeCount();
    if (!activeCount) {
      return;
    }

    const completedItems = activeCount.items.map((item) => {
      const actualStock = this.actualStocks()[item.productId] ?? item.systemStock;
      return {
        ...item,
        actualStock,
        difference: actualStock - item.systemStock,
      };
    });

    const count = await this.store.recordInventoryCount(completedItems);
    this.activeCount.set(null);
    this.actualStocks.set({});
    this.pageMessage.set(`Inventura zavrsena: ${count.items.length} artikala.`);
  }

  protected discrepancyCount(count: InventoryCount): number {
    return count.items.filter((item) => item.difference !== 0).length;
  }

  protected currentActualStock(productId: string, systemStock: number): number {
    return this.actualStocks()[productId] ?? systemStock;
  }

  protected difference(productId: string, systemStock: number): number {
    return this.currentActualStock(productId, systemStock) - systemStock;
  }

  protected differenceClass(value: number): string {
    if (value < 0) {
      return 'inventory-count__diff inventory-count__diff--negative';
    }

    if (value > 0) {
      return 'inventory-count__diff inventory-count__diff--positive';
    }

    return 'inventory-count__diff';
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
