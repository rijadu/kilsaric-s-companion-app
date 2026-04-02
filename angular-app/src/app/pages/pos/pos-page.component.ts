import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';
import { CartItem, Customer, Product, getItemTotal } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';
import {
  ReceiptData,
  isSerialSupported,
  printReceiptSerial,
} from '../../shared/thermal-printer';

type DiscountType = 'percent' | 'fixed';

interface ReceiptSnapshot {
  items: CartItem[];
  subtotal: number;
  discount?: {
    type: DiscountType;
    value: number;
  };
  total: number;
  method: 'cash' | 'card';
  receiptNumber: string;
  date: Date;
  customerName?: string;
}

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './pos-page.component.html',
  styleUrl: './pos-page.component.css',
})
export class PosPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly products = this.store.products;
  private readonly customers = this.store.customers;
  private scanner: Html5Qrcode | null = null;

  protected readonly scannerRegionId = 'pos-scanner-region';
  protected readonly serialSupported = isSerialSupported();
  protected readonly search = signal('');
  protected readonly cart = signal<CartItem[]>([]);
  protected readonly showCheckout = signal(false);
  protected readonly selectedCustomerId = signal<string | null>(null);
  protected readonly showCustomerPicker = signal(false);
  protected readonly customerSearch = signal('');
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
  protected readonly lastSale = signal<ReceiptSnapshot | null>(null);
  protected readonly pageMessage = signal<string | null>(null);

  protected readonly selectedCustomer = computed(() => {
    const customerId = this.selectedCustomerId();
    return customerId
      ? this.customers().find((customer) => customer.id === customerId) ?? null
      : null;
  });

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

  protected readonly filteredCustomers = computed(() => {
    const query = this.customerSearch().trim().toLowerCase();
    const customers = this.customers();
    if (!query) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.email?.toLowerCase().includes(query),
    );
  });

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
        this.pageMessage.set(`${product.name} dodat u korpu.`);
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

  protected updateCustomerSearch(value: string): void {
    this.customerSearch.set(value);
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
      this.pageMessage.set(`Proizvod nije pronađen: ${rawCode}`);
      return;
    }

    this.addToCart(product);
    this.pageMessage.set(`${product.name} dodat u korpu.`);
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

  protected toggleCustomerPicker(): void {
    this.showCustomerPicker.update((value) => !value);
  }

  protected selectCustomer(customer: Customer): void {
    this.selectedCustomerId.set(customer.id);
    this.showCustomerPicker.set(false);
    this.customerSearch.set('');

    if (customer.defaultDiscount) {
      this.cartDiscount.set({ ...customer.defaultDiscount });
      this.pageMessage.set(`Primenjen podrazumevani popust za ${customer.name}.`);
    } else {
      this.pageMessage.set(`Kupac je izabran: ${customer.name}.`);
    }
  }

  protected clearSelectedCustomer(): void {
    this.selectedCustomerId.set(null);
    this.cartDiscount.set(null);
    this.pageMessage.set('Kupac je uklonjen sa računa.');
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
    this.pageMessage.set(null);
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

  protected toggleCheckout(): void {
    this.showCheckout.update((value) => !value);
  }

  protected async completeCheckout(method: 'cash' | 'card'): Promise<void> {
    if (this.cart().length === 0) {
      return;
    }

    await this.stopScanner();

    const sale = await this.store.recordSale({
      items: this.cart(),
      discount: this.cartDiscount() ?? undefined,
      paymentMethod: method,
      customerId: this.selectedCustomer()?.id ?? undefined,
      customerName: this.selectedCustomer()?.name ?? undefined,
    });

    if (!sale) {
      this.pageMessage.set('Prodaja nije mogla da se sačuva. Proverite stanje artikala.');
      return;
    }

    const saleDate = new Date(sale.date);
    const receiptNumber = this.generateReceiptNumber(saleDate);
    this.lastSale.set({
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      method,
      receiptNumber,
      date: saleDate,
      customerName: sale.customerName,
    });

    this.cart.set([]);
    this.cartDiscount.set(null);
    this.selectedCustomerId.set(null);
    this.showCustomerPicker.set(false);
    this.showCartDiscount.set(false);
    this.showCheckout.set(false);
    this.pageMessage.set(
      `Prodaja je završena: ${this.formatCurrency(sale.total)} RSD · ${method === 'cash' ? 'Gotovina' : 'Kartica'}.`,
    );
  }

  protected clearLastSale(): void {
    this.lastSale.set(null);
  }

  protected printBrowser(): void {
    window.print();
  }

  protected async printThermal(): Promise<void> {
    const sale = this.lastSale();
    if (!sale) {
      return;
    }

    const receiptData: ReceiptData = {
      shopName: 'GVOZDARA',
      shopAddress: 'Ulica Primer 1, Beograd',
      shopPhone: '011/123-4567',
      receiptNumber: sale.receiptNumber,
      date: sale.date,
      items: sale.items.map((item) => ({
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unit: item.product.unit,
        price: item.product.sellingPrice,
        total: getItemTotal(item),
      })),
      total: sale.total,
      paymentMethod: sale.method,
    };

    try {
      await printReceiptSerial(receiptData);
      this.pageMessage.set('Račun je poslat na termički štampač.');
    } catch (error) {
      this.pageMessage.set(`Stampa nije uspela: ${this.formatError(error)}`);
    }
  }

  ngOnDestroy(): void {
    void this.stopScanner();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected formatDate(value: Date): string {
    return value.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected formatTime(value: Date): string {
    return value.toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected itemBaseTotal(item: CartItem): number {
    return item.product.sellingPrice * item.quantity;
  }

  protected itemTotal(item: CartItem): number {
    return getItemTotal(item);
  }

  protected customerDiscountLabel(customer: Customer): string | null {
    if (!customer.defaultDiscount) {
      return null;
    }

    return customer.defaultDiscount.type === 'percent'
      ? `${customer.defaultDiscount.value}%`
      : `${this.formatCurrency(customer.defaultDiscount.value)} RSD`;
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

  private generateReceiptNumber(date: Date): string {
    return `R-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : 'Nepoznata greška';
  }
}
