import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';
import { CartItem, Product, getItemTotal } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';
import { SnackbarService } from '../../shared/snackbar.service';

type DiscountType = 'percent' | 'fixed';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pos-page.component.html',
  styleUrl: './pos-page.component.css',
})
export class PosPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly snackbar = inject(SnackbarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly products = this.store.products;
  private scanner: Html5Qrcode | null = null;

  protected readonly scannerRegionId = 'pos-scanner-region';
  protected readonly search = signal('');
  protected readonly cart = signal<CartItem[]>([]);
  protected readonly scanning = signal(false);
  protected readonly showCartDiscount = signal(false);
  protected readonly cartDiscountInput = signal('');
  protected readonly cartDiscountType = signal<DiscountType>('percent');
  protected readonly cartDiscount = signal<{
    type: DiscountType;
    value: number;
  } | null>(null);
  protected readonly editingItemDiscountId = signal<string | null>(null);
  protected readonly itemDiscountInput = signal('');
  protected readonly itemDiscountType = signal<DiscountType>('percent');

  protected readonly searchResults = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return [];
    }

    return this.products()
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode.includes(query),
      )
      .slice(0, 8);
  });

  protected readonly suggestedProducts = computed(() =>
    this.products()
      .filter((product) => product.status === 'active')
      .slice(0, 6),
  );

  protected readonly subtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + getItemTotal(item), 0),
  );

  protected readonly total = computed(() =>
    this.applyDiscount(this.subtotal(), this.cartDiscount()),
  );

  protected readonly unitLabels: Record<Product['unit'], string> = {
    piece: 'kom',
    kg: 'kg',
    meter: 'm',
    liter: 'L',
    box: 'kutija',
  };

  constructor() {
    effect(() => {
      const addId = this.queryParams().get('add');
      if (!addId) {
        return;
      }

      const product = this.products().find((entry) => entry.id === addId);
      if (product) {
        this.addToCart(product, false);
        this.snackbar.success(`${product.name} dodat u korpu.`);
      }

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { add: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
  }

  protected addToCart(product: Product, incrementExisting = true): void {
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        if (!incrementExisting) {
          return items;
        }

        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...items,
        {
          product,
          quantity: 1,
        },
      ];
    });

    this.search.set('');
  }

  protected addToCartByBarcode(rawCode: string): void {
    const product = this.store.findProductByCode(rawCode);
    if (!product) {
      this.snackbar.error(`Proizvod nije pronađen: ${rawCode}`);
      return;
    }

    this.addToCart(product);
    this.snackbar.success(`${product.name} dodat u korpu.`);
  }

  protected submitSearch(): void {
    const query = this.search().trim();
    if (!query) {
      return;
    }

    this.addToCartByBarcode(query);
    this.search.set('');
  }

  protected updateQuantity(productId: string, delta: number): void {
    this.cart.update((items) =>
      items
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  protected setQuantity(productId: string, value: string): void {
    const parsed = this.parseNumber(value);
    if (!parsed || parsed <= 0) {
      this.removeItem(productId);
      return;
    }

    this.cart.update((items) =>
      items.map((item) =>
        item.product.id === productId ? { ...item, quantity: parsed } : item,
      ),
    );
  }

  protected removeItem(productId: string): void {
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
  }

  protected openItemDiscount(item: CartItem): void {
    this.editingItemDiscountId.set(item.product.id);
    this.itemDiscountInput.set(item.discount?.value?.toString() ?? '');
    this.itemDiscountType.set(item.discount?.type ?? 'percent');
  }

  protected toggleItemDiscountType(): void {
    this.itemDiscountType.set(
      this.itemDiscountType() === 'percent' ? 'fixed' : 'percent',
    );
  }

  protected updateItemDiscountInput(value: string): void {
    this.itemDiscountInput.set(value);
  }

  protected submitItemDiscount(productId: string): void {
    const parsed = this.parseNumber(this.itemDiscountInput());
    this.cart.update((items) =>
      items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              discount:
                parsed && parsed > 0
                  ? { type: this.itemDiscountType(), value: parsed }
                  : undefined,
            }
          : item,
      ),
    );
    this.closeItemDiscount();
  }

  protected closeItemDiscount(): void {
    this.editingItemDiscountId.set(null);
    this.itemDiscountInput.set('');
  }

  protected openCartDiscount(): void {
    this.showCartDiscount.set(true);
    this.cartDiscountInput.set(this.cartDiscount()?.value?.toString() ?? '');
    this.cartDiscountType.set(this.cartDiscount()?.type ?? 'percent');
  }

  protected toggleCartDiscountType(): void {
    this.cartDiscountType.set(
      this.cartDiscountType() === 'percent' ? 'fixed' : 'percent',
    );
  }

  protected updateCartDiscountInput(value: string): void {
    this.cartDiscountInput.set(value);
  }

  protected submitCartDiscount(): void {
    const parsed = this.parseNumber(this.cartDiscountInput());
    this.cartDiscount.set(
      parsed && parsed > 0
        ? {
            type: this.cartDiscountType(),
            value: parsed,
          }
        : null,
    );
    this.showCartDiscount.set(false);
  }

  protected clearCartDiscount(): void {
    this.cartDiscount.set(null);
    this.cartDiscountInput.set('');
    this.showCartDiscount.set(false);
  }

  protected async startScanner(): Promise<void> {
    this.search.set('');
    this.scanning.set(true);

    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      this.scanner = new Html5Qrcode(this.scannerRegionId);
      await this.scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 2,
        },
        (decodedText) => {
          this.addToCartByBarcode(decodedText);
        },
        () => undefined,
      );
    } catch (error) {
      this.scanning.set(false);
      this.snackbar.error(`Kamera nije mogla da se pokrene: ${this.formatError(error)}`);
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

  protected async completeCheckout(): Promise<void> {
    if (this.cart().length === 0) {
      return;
    }

    await this.stopScanner();

    const sale = await this.store.recordSale({
      items: this.cart(),
      discount: this.cartDiscount() ?? undefined,
      paymentMethod: 'cash',
    });

    if (!sale) {
      this.snackbar.error('Prodaja nije mogla da se sačuva. Proverite stanje artikala.');
      return;
    }

    this.cart.set([]);
    this.cartDiscount.set(null);
    this.showCartDiscount.set(false);
    this.snackbar.success(`Prodaja završena: ${this.formatCurrency(sale.total)} RSD.`);
  }

  ngOnDestroy(): void {
    void this.stopScanner();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected itemBaseTotal(item: CartItem): number {
    return item.product.sellingPrice * item.quantity;
  }

  protected itemTotal(item: CartItem): number {
    return getItemTotal(item);
  }

  private parseNumber(value: string): number {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private applyDiscount(
    base: number,
    discount: {
      type: DiscountType;
      value: number;
    } | null,
  ): number {
    if (!discount) {
      return base;
    }

    return discount.type === 'percent'
      ? base * (1 - discount.value / 100)
      : Math.max(0, base - discount.value);
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : 'Nepoznata greška';
  }
}
