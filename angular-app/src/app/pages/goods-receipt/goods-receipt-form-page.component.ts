import { FormsModule } from '@angular/forms';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';
import { Product } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

interface ReceiptItemDraft {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  unit: Product['unit'];
}

@Component({
  selector: 'app-goods-receipt-form-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './goods-receipt-form-page.component.html',
  styleUrl: './goods-receipt-form-page.component.css',
})
export class GoodsReceiptFormPageComponent implements OnDestroy {
  private readonly store = inject(MockStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly allProducts = this.store.products;
  protected readonly suppliers = this.store.suppliers;
  private scanner: Html5Qrcode | null = null;
  protected readonly scannerRegionId = 'goods-receipt-scanner';

  protected readonly editingId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditing = !!this.editingId;

  protected readonly supplier = signal('');
  protected readonly note = signal('');
  protected readonly items = signal<ReceiptItemDraft[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly showSearch = signal(false);
  protected readonly scanning = signal(false);
  protected readonly pageMessage = signal<string | null>(null);
  protected readonly showSupplierSuggestions = signal(false);

  constructor() {
    if (this.editingId) {
      const receipt = this.store.goodsReceipts().find((r) => r.id === this.editingId);
      if (receipt) {
        this.supplier.set(receipt.supplier === 'Nepoznat' ? '' : receipt.supplier);
        this.note.set(receipt.note ?? '');
        this.items.set(receipt.items.map((i) => ({ ...i })));
      } else {
        void this.router.navigate(['/goods-receipt']);
      }
    }
  }

  protected readonly filteredSuppliers = computed(() => {
    const query = this.supplier().trim().toLowerCase();
    if (!query) return this.suppliers().slice(0, 6);
    return this.suppliers()
      .filter((s) => s.name.toLowerCase().includes(query))
      .slice(0, 6);
  });

  protected readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return [];
    return this.allProducts()
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode.includes(query),
      )
      .slice(0, 5);
  });

  protected readonly totalCost = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
  );

  protected readonly unitLabels: Record<Product['unit'], string> = {
    piece: 'kom',
    kg: 'kg',
    meter: 'm',
    liter: 'L',
    box: 'kutija',
  };

  protected updateSupplier(value: string): void {
    this.supplier.set(value);
    this.showSupplierSuggestions.set(true);
  }

  protected selectSupplier(name: string): void {
    this.supplier.set(name);
    this.showSupplierSuggestions.set(false);
  }

  protected hideSupplierSuggestions(): void {
    setTimeout(() => this.showSupplierSuggestions.set(false), 150);
  }

  protected updateNote(value: string): void {
    this.note.set(value);
  }

  protected updateSearch(value: string): void {
    this.searchQuery.set(value);
    this.showSearch.set(true);
  }

  protected incrementQty(index: number): void {
    this.items.update((items) =>
      items.map((item, i) => (i === index ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  }

  protected decrementQty(index: number): void {
    this.items.update((items) =>
      items.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
      ),
    );
  }

  protected addItem(product: Product): void {
    this.items.update((items) => {
      const existing = items.find((item) => item.productId === product.id);
      if (existing) {
        return items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...items,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          unit: product.unit,
        },
      ];
    });
    this.pageMessage.set(`${product.name} je dodat.`);
    this.searchQuery.set('');
    this.showSearch.set(false);
  }

  protected addItemByBarcode(code: string): void {
    const product = this.store.findProductByCode(code);
    if (!product) {
      this.pageMessage.set(`Proizvod nije pronađen: ${code}`);
      return;
    }
    this.addItem(product);
  }

  protected handleSearchEnter(): void {
    const query = this.searchQuery().trim();
    if (query) this.addItemByBarcode(query);
  }

  protected updateItem(
    index: number,
    field: 'quantity' | 'costPrice' | 'sellingPrice',
    value: string,
  ): void {
    const parsed = Number.parseFloat(value);
    this.items.update((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: Number.isFinite(parsed)
                ? field === 'quantity'
                  ? Math.max(1, Math.round(parsed))
                  : parsed
                : field === 'quantity'
                  ? 1
                  : 0,
            }
          : item,
      ),
    );
  }

  protected removeItem(index: number): void {
    this.items.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  protected async startScanner(): Promise<void> {
    this.scanning.set(true);
    this.pageMessage.set(null);
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      this.scanner = new Html5Qrcode(this.scannerRegionId);
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 250, height: 150 }, aspectRatio: 1.333 },
        (decodedText) => { this.addItemByBarcode(decodedText); },
        () => undefined,
      );
    } catch (error) {
      this.scanning.set(false);
      this.pageMessage.set(`Kamera nije mogla da se pokrene: ${this.formatError(error)}`);
    }
  }

  protected async stopScanner(): Promise<void> {
    if (this.scanner) {
      try {
        await this.scanner.stop();
        await this.scanner.clear();
      } catch {
        // Ignore scanner shutdown races.
      } finally {
        this.scanner = null;
      }
    }
    this.scanning.set(false);
  }

  protected async submit(): Promise<void> {
    if (this.items().length === 0) {
      this.pageMessage.set('Dodajte barem jedan artikal.');
      return;
    }

    if (this.editingId) {
      this.store.updateGoodsReceipt(this.editingId, {
        supplier: this.supplier(),
        note: this.note(),
        items: this.items(),
      });
    } else {
      const receipt = await this.store.recordGoodsReceipt({
        supplier: this.supplier(),
        note: this.note(),
        items: this.items(),
      });
      if (!receipt) {
        this.pageMessage.set('Dodajte barem jedan artikal.');
        return;
      }
    }

    void this.stopScanner();
    void this.router.navigate(['/goods-receipt'], {
      queryParams: { saved: this.isEditing ? 'updated' : 'created' },
    });
  }

  protected cancel(): void {
    void this.stopScanner();
    void this.router.navigate(['/goods-receipt']);
  }

  protected margin(item: ReceiptItemDraft): number | null {
    return item.costPrice > 0
      ? ((item.sellingPrice - item.costPrice) / item.costPrice) * 100
      : null;
  }

  ngOnDestroy(): void {
    void this.stopScanner();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : 'Nepoznata greška';
  }
}
