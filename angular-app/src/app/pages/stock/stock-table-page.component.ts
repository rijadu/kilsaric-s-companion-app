import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, getMarginPercent } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

type SortKey = 'name' | 'stock' | 'sellingPrice' | 'category';

@Component({
  selector: 'app-stock-table-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './stock-table-page.component.html',
  styleUrl: './stock-table-page.component.css',
})
export class StockTablePageComponent {
  private readonly store = inject(MockStoreService);
  private readonly location = inject(Location);
  private readonly allProducts = this.store.products;

  protected readonly search = signal('');
  protected readonly sortBy = signal<SortKey>('name');
  protected readonly sortAsc = signal(true);
  protected readonly showLowOnly = signal(false);

  protected readonly products = computed(() => {
    const term = this.search().trim().toLowerCase();
    const sortBy = this.sortBy();
    const sortAsc = this.sortAsc();
    const showLowOnly = this.showLowOnly();

    return this.allProducts()
      .filter((product) => {
        const matchesSearch =
          !term ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          product.barcode.includes(term);
        const matchesLow = !showLowOnly || product.stock <= product.lowStockThreshold;
        return matchesSearch && matchesLow;
      })
      .sort((left, right) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = left.name.localeCompare(right.name);
            break;
          case 'stock':
            comparison = left.stock - right.stock;
            break;
          case 'sellingPrice':
            comparison = left.sellingPrice - right.sellingPrice;
            break;
          case 'category':
            comparison = left.category.localeCompare(right.category);
            break;
        }

        return sortAsc ? comparison : -comparison;
      });
  });

  protected readonly lowStockCount = computed(
    () => this.store.lowStockProducts().length,
  );

  protected readonly unitLabels: Record<Product['unit'], string> = {
    piece: 'kom',
    kg: 'kg',
    meter: 'm',
    liter: 'L',
    box: 'kut',
  };

  protected goBack(): void {
    this.location.back();
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
  }

  protected toggleLowOnly(): void {
    this.showLowOnly.update((value) => !value);
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortBy() === key) {
      this.sortAsc.update((value) => !value);
      return;
    }

    this.sortBy.set(key);
    this.sortAsc.set(true);
  }

  protected margin(product: Product): string {
    return getMarginPercent(product).toFixed(0);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }
}
