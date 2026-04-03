import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CartItem,
  Customer,
  GoodsReceipt,
  InventoryCount,
  Product,
  Sale,
  StockChange,
  Supplier,
  Variant,
  brands,
  categories,
  getProfit,
  subcategories,
} from './mock-data';

// ── API response shapes (backend uses flat discount fields) ──────────────────

interface ApiCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  discountType?: string;
  discountValue?: number;
  note?: string;
  createdAt: string;
}

interface ApiSupplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  productNames: string[];
  createdAt: string;
}

interface ApiSaleItem {
  productId: string;
  productName: string;
  productSku: string;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  discountType?: string;
  discountValue?: number;
  lineTotal: number;
}

interface ApiSale {
  id: string;
  items: ApiSaleItem[];
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  customerId?: string;
  customerName?: string;
  date: string;
  status: 'completed' | 'refunded';
  refundDate?: string;
  refundReason?: string;
}

interface ApiStockChange {
  id: string;
  productId: string;
  productName: string;
  type: StockChange['type'];
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  date: string;
}

interface ApiGoodsReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
  unit?: Product['unit'];
}

interface ApiGoodsReceipt {
  id: string;
  supplierName: string;
  items: ApiGoodsReceiptItem[];
  totalCost: number;
  date: string;
  note?: string;
}

interface ApiInventoryCount {
  id: string;
  date: string;
  status: 'in_progress' | 'completed';
  items: Array<{
    productId: string;
    productName: string;
    systemStock: number;
    actualStock: number;
    difference: number;
  }>;
}

// ── Exported public types (unchanged — components depend on these) ────────────

export type DashboardPeriod = 'today' | 'week' | 'month';

export interface DashboardStatCard {
  title: string;
  value: string;
  trend: string;
  badge: string;
  route: string;
  variant?: 'default' | 'success';
}

export interface DashboardSummary {
  periodLabel: string;
  completedSales: Sale[];
  cashTotal: number;
  cardTotal: number;
  soldItems: number;
  averageReceipt: number;
  totalRevenue: number;
  totalProfit: number;
  totalItemsInStock: number;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapCustomer(c: ApiCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    note: c.note,
    createdAt: c.createdAt,
    defaultDiscount:
      c.discountType && c.discountValue != null
        ? { type: c.discountType as 'percent' | 'fixed', value: c.discountValue }
        : undefined,
  };
}

function mapSupplier(s: ApiSupplier): Supplier {
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    note: s.note,
    products: s.productNames,
    createdAt: s.createdAt,
  };
}

function mapSaleItem(item: ApiSaleItem): CartItem {
  const product: Product = {
    id: item.productId,
    name: item.productName,
    sku: item.productSku,
    barcode: '',
    category: '',
    brand: '',
    description: '',
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    unit: item.unit as Product['unit'],
    stock: 0,
    lowStockThreshold: 0,
    status: 'active',
  };
  const variant: Variant | undefined =
    item.variantId
      ? { id: item.variantId, name: item.variantName ?? '', sku: '', stock: 0 }
      : undefined;
  return {
    product,
    variant,
    quantity: item.quantity,
    discount:
      item.discountType && item.discountValue != null
        ? { type: item.discountType as 'percent' | 'fixed', value: item.discountValue }
        : undefined,
  };
}

function mapSale(s: ApiSale): Sale {
  return {
    id: s.id,
    items: s.items.map(mapSaleItem),
    subtotal: s.subtotal,
    discount:
      s.discountType && s.discountValue != null
        ? { type: s.discountType as 'percent' | 'fixed', value: s.discountValue }
        : undefined,
    total: s.total,
    paymentMethod: s.paymentMethod,
    customerId: s.customerId,
    customerName: s.customerName,
    date: s.date,
    status: s.status,
    refundDate: s.refundDate,
    refundReason: s.refundReason,
  };
}

function mapStockChange(c: ApiStockChange): StockChange {
  return {
    id: c.id,
    productId: c.productId,
    productName: c.productName,
    type: c.type,
    quantity: c.quantity,
    previousStock: c.previousStock,
    newStock: c.newStock,
    note: c.note,
    date: c.date,
  };
}

function mapGoodsReceipt(r: ApiGoodsReceipt): GoodsReceipt {
  return {
    id: r.id,
    supplier: r.supplierName,
    items: r.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice ?? 0,
      unit: item.unit ?? 'piece',
    })),
    totalCost: r.totalCost,
    date: r.date,
    note: r.note,
  };
}

function mapInventoryCount(c: ApiInventoryCount): InventoryCount {
  return {
    id: c.id,
    date: c.date,
    status: c.status,
    items: c.items,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = environment.apiUrl;

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: 'Danas',
  week: 'Ova nedelja',
  month: 'Ovaj mesec',
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MockStoreService {
  private readonly http = inject(HttpClient);

  // ── Internal state ─────────────────────────────────────────────────────────
  private readonly _products = signal<Product[]>([]);
  private readonly _customers = signal<Customer[]>([]);
  private readonly _suppliers = signal<Supplier[]>([]);
  private readonly _sales = signal<Sale[]>([]);
  private readonly _stockChanges = signal<StockChange[]>([]);
  private readonly _goodsReceipts = signal<GoodsReceipt[]>([]);
  private readonly _inventoryCounts = signal<InventoryCount[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  // ── Public read-only signals (same names as before) ────────────────────────
  readonly products = this._products.asReadonly();
  readonly customers = this._customers.asReadonly();
  readonly suppliers = this._suppliers.asReadonly();
  readonly sales = this._sales.asReadonly();
  readonly stockChanges = this._stockChanges.asReadonly();
  readonly goodsReceipts = this._goodsReceipts.asReadonly();
  readonly inventoryCounts = this._inventoryCounts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly availableCategories = categories;
  readonly availableBrands = brands;
  readonly availableSubcategories = subcategories;

  // ── Derived signals (identical API as before) ──────────────────────────────
  readonly lowStockProducts = computed(() =>
    this._products().filter((p) => p.stock <= p.lowStockThreshold),
  );

  readonly salesByPeriod = computed(() => {
    const now = new Date();
    const all = this._sales().filter((s) => s.status === 'completed');
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 1);
    return {
      today: all.filter((s) => new Date(s.date).toDateString() === now.toDateString()),
      week: all.filter((s) => new Date(s.date) >= weekStart),
      month: all.filter((s) => new Date(s.date) >= monthStart),
    };
  });

  readonly dashboardSummaryByPeriod = computed<Record<DashboardPeriod, DashboardSummary>>(() => {
    const byPeriod = this.salesByPeriod();
    const totalItemsInStock = this._products().reduce((sum, p) => sum + p.stock, 0);

    const build = (period: DashboardPeriod): DashboardSummary => {
      const completedSales = byPeriod[period];
      const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
      const totalProfit = completedSales.reduce(
        (sum, s) => sum + s.items.reduce((iSum, i) => iSum + getProfit(i), 0),
        0,
      );
      const cashTotal = completedSales
        .filter((s) => s.paymentMethod === 'cash')
        .reduce((sum, s) => sum + s.total, 0);
      const cardTotal = completedSales
        .filter((s) => s.paymentMethod === 'card')
        .reduce((sum, s) => sum + s.total, 0);
      const soldItems = completedSales.reduce(
        (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
        0,
      );
      return {
        periodLabel: PERIOD_LABELS[period],
        completedSales,
        cashTotal,
        cardTotal,
        soldItems,
        averageReceipt: completedSales.length ? totalRevenue / completedSales.length : 0,
        totalRevenue,
        totalProfit,
        totalItemsInStock,
      };
    };

    return { today: build('today'), week: build('week'), month: build('month') };
  });

  readonly dashboardCardsByPeriod = computed<Record<DashboardPeriod, DashboardStatCard[]>>(() => {
    const summaries = this.dashboardSummaryByPeriod();
    const build = (period: DashboardPeriod): DashboardStatCard[] => {
      const s = summaries[period];
      return [
        {
          title: 'Artikala',
          value: String(this._products().length),
          trend: `${this.fmt(s.totalItemsInStock)} na stanju`,
          badge: 'RO',
          route: '/products',
        },
        {
          title: `${s.periodLabel} pazar`,
          value: this.fmt(s.totalRevenue),
          trend: `${s.completedSales.length} prodaja`,
          badge: 'RS',
          route: '/history',
          variant: 'success',
        },
        {
          title: 'Zarada',
          value: this.fmt(s.totalProfit),
          trend: 'Vidi izveštaje →',
          badge: 'ZR',
          route: '/reports',
          variant: 'success',
        },
        {
          title: 'Nova prodaja',
          value: '',
          trend: 'Otvori kasu →',
          badge: 'KA',
          route: '/pos',
        },
      ];
    };
    return { today: build('today'), week: build('week'), month: build('month') };
  });

  readonly saleItemsLabelById = computed<Record<string, string>>(() => {
    const labels: Record<string, string> = {};
    for (const sale of this._sales()) {
      labels[sale.id] = sale.items
        .map((item) => `${item.product.name} x${item.quantity}`)
        .join(', ');
    }
    return labels;
  });

  readonly customerStatsById = computed<
    Record<string, { salesCount: number; totalSpent: number; totalProfit: number; sales: Sale[] }>
  >(() => {
    const result: Record<
      string,
      { salesCount: number; totalSpent: number; totalProfit: number; sales: Sale[] }
    > = {};
    for (const customer of this._customers()) {
      const customerSales = this._sales().filter((s) => s.customerId === customer.id);
      const completed = customerSales.filter((s) => s.status === 'completed');
      result[customer.id] = {
        salesCount: completed.length,
        totalSpent: completed.reduce((sum, s) => sum + s.total, 0),
        totalProfit: completed.reduce(
          (sum, s) => sum + s.items.reduce((iSum, i) => iSum + getProfit(i), 0),
          0,
        ),
        sales: customerSales,
      };
    }
    return result;
  });

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  constructor() {
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    try {
      const [products, customers, suppliers, sales, stockChanges, goodsReceipts, inventoryCounts] =
        await Promise.all([
          firstValueFrom(this.http.get<Product[]>(`${BASE}/products`)),
          firstValueFrom(this.http.get<ApiCustomer[]>(`${BASE}/customers`)),
          firstValueFrom(this.http.get<ApiSupplier[]>(`${BASE}/suppliers`)),
          firstValueFrom(this.http.get<ApiSale[]>(`${BASE}/sales`)),
          firstValueFrom(this.http.get<ApiStockChange[]>(`${BASE}/stock/changes`)),
          firstValueFrom(this.http.get<ApiGoodsReceipt[]>(`${BASE}/stock/receipts`)),
          firstValueFrom(this.http.get<ApiInventoryCount[]>(`${BASE}/stock/inventory-counts`)),
        ]);

      this._products.set(products);
      this._customers.set(customers.map(mapCustomer));
      this._suppliers.set(suppliers.map(mapSupplier));
      this._sales.set(sales.map(mapSale));
      this._stockChanges.set(stockChanges.map(mapStockChange));
      this._goodsReceipts.set(goodsReceipts.map(mapGoodsReceipt));
      this._inventoryCounts.set(inventoryCounts.map(mapInventoryCount));
    } catch {
      this._error.set('Nije moguće povezati se sa serverom. Proverite da li je backend pokrenut.');
    } finally {
      this._loading.set(false);
    }
  }

  // ── Products ───────────────────────────────────────────────────────────────
  getProductById(id: string): Product | undefined {
    return this._products().find((p) => p.id === id);
  }

  findProductByCode(search: string): Product | undefined {
    const query = search.trim();
    if (query.length < 3) return undefined;
    const normalized = query.toLowerCase();
    return this._products().find(
      (p) =>
        p.barcode.includes(query) ||
        p.sku.toLowerCase().includes(normalized) ||
        p.name.toLowerCase().includes(normalized),
    );
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const created = await firstValueFrom(
      this.http.post<Product>(`${BASE}/products`, this.toProductDto(product)),
    );
    this._products.update((list) => [created, ...list]);
    return created;
  }

  async updateProduct(product: Product): Promise<Product | undefined> {
    const updated = await firstValueFrom(
      this.http.patch<Product>(`${BASE}/products/${product.id}`, this.toProductDto(product)),
    );
    this._products.update((list) => list.map((p) => (p.id === product.id ? updated : p)));
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${BASE}/products/${id}`));
    this._products.update((list) => list.filter((p) => p.id !== id));
  }

  async applyStockCorrection(
    productId: string,
    quantity: number,
    note: string,
  ): Promise<{ previousStock: number; newStock: number } | undefined> {
    const change = await firstValueFrom(
      this.http.post<ApiStockChange>(`${BASE}/stock/correction`, { productId, quantity, note }),
    );
    this._stockChanges.update((list) => [mapStockChange(change), ...list]);
    this._products.update((list) =>
      list.map((p) => (p.id === productId ? { ...p, stock: change.newStock } : p)),
    );
    return { previousStock: change.previousStock, newStock: change.newStock };
  }

  // ── Customers ──────────────────────────────────────────────────────────────
  getCustomerById(id: string): Customer | undefined {
    return this._customers().find((c) => c.id === id);
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const created = await firstValueFrom(
      this.http.post<ApiCustomer>(`${BASE}/customers`, this.toCustomerDto(customer)),
    );
    const mapped = mapCustomer(created);
    this._customers.update((list) => [mapped, ...list]);
    return mapped;
  }

  async updateCustomer(customer: Customer): Promise<Customer | undefined> {
    const updated = await firstValueFrom(
      this.http.patch<ApiCustomer>(
        `${BASE}/customers/${customer.id}`,
        this.toCustomerDto(customer),
      ),
    );
    const mapped = mapCustomer(updated);
    this._customers.update((list) => list.map((c) => (c.id === customer.id ? mapped : c)));
    return mapped;
  }

  async deleteCustomer(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${BASE}/customers/${id}`));
    this._customers.update((list) => list.filter((c) => c.id !== id));
  }

  // ── Suppliers ──────────────────────────────────────────────────────────────
  getSupplierById(id: string): Supplier | undefined {
    return this._suppliers().find((s) => s.id === id);
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    const created = await firstValueFrom(
      this.http.post<ApiSupplier>(`${BASE}/suppliers`, {
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        note: supplier.note,
        productNames: supplier.products ?? [],
      }),
    );
    const mapped = mapSupplier(created);
    this._suppliers.update((list) => [mapped, ...list]);
    return mapped;
  }

  async updateSupplier(supplier: Supplier): Promise<Supplier | undefined> {
    const updated = await firstValueFrom(
      this.http.patch<ApiSupplier>(`${BASE}/suppliers/${supplier.id}`, {
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        note: supplier.note,
        productNames: supplier.products ?? [],
      }),
    );
    const mapped = mapSupplier(updated);
    this._suppliers.update((list) => list.map((s) => (s.id === supplier.id ? mapped : s)));
    return mapped;
  }

  async deleteSupplier(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${BASE}/suppliers/${id}`));
    this._suppliers.update((list) => list.filter((s) => s.id !== id));
  }

  // ── Sales ──────────────────────────────────────────────────────────────────
  async recordSale(input: {
    items: CartItem[];
    discount?: { type: 'percent' | 'fixed'; value: number };
    paymentMethod: 'cash' | 'card';
    customerId?: string;
    customerName?: string;
  }): Promise<Sale | undefined> {
    if (input.items.length === 0) return undefined;

    const apiSale = await firstValueFrom(
      this.http.post<ApiSale>(`${BASE}/sales`, {
        items: input.items.map((i) => ({
          productId: i.product.id,
          variantId: i.variant?.id,
          quantity: i.quantity,
          discountType: i.discount?.type,
          discountValue: i.discount?.value,
        })),
        discountType: input.discount?.type,
        discountValue: input.discount?.value,
        paymentMethod: input.paymentMethod,
        customerId: input.customerId,
        customerName: input.customerName,
      }),
    );

    const mapped = mapSale(apiSale);
    this._sales.update((list) => [mapped, ...list]);

    // Deduct stock locally so UI reflects the change immediately
    for (const item of apiSale.items) {
      this._products.update((list) =>
        list.map((p) =>
          p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p,
        ),
      );
    }

    return mapped;
  }

  async recordQuickSale(
    productId: string,
    quantity: number,
  ): Promise<{ sale: Sale; total: number } | undefined> {
    const product = this._products().find((p) => p.id === productId);
    if (!product || quantity <= 0) return undefined;
    const sale = await this.recordSale({ items: [{ product, quantity }], paymentMethod: 'cash' });
    if (!sale) return undefined;
    return { sale, total: sale.total };
  }

  async refundSale(
    saleId: string,
    reason: string,
  ): Promise<{ refundDate: string; restoredItems: number } | undefined> {
    const apiSale = await firstValueFrom(
      this.http.post<ApiSale>(`${BASE}/sales/${saleId}/refund`, { reason }),
    );
    const mapped = mapSale(apiSale);
    this._sales.update((list) => list.map((s) => (s.id === saleId ? mapped : s)));

    // Restore stock locally
    for (const item of apiSale.items) {
      this._products.update((list) =>
        list.map((p) =>
          p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p,
        ),
      );
    }

    const restoredItems = apiSale.items.reduce((sum, i) => sum + i.quantity, 0);
    return { refundDate: apiSale.refundDate ?? new Date().toISOString(), restoredItems };
  }

  // ── Stock ──────────────────────────────────────────────────────────────────
  async recordGoodsReceipt(receipt: {
    supplier: string;
    note?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      costPrice: number;
      sellingPrice: number;
      unit: Product['unit'];
    }>;
  }): Promise<GoodsReceipt | undefined> {
    if (receipt.items.length === 0) return undefined;

    const created = await firstValueFrom(
      this.http.post<ApiGoodsReceipt>(`${BASE}/stock/receipts`, {
        supplierName: receipt.supplier.trim() || 'Nepoznat',
        note: receipt.note,
        items: receipt.items,
      }),
    );

    const mapped: GoodsReceipt = {
      id: created.id,
      supplier: created.supplierName,
      items: receipt.items,
      totalCost: created.totalCost,
      date: created.date,
      note: created.note,
    };
    this._goodsReceipts.update((list) => [mapped, ...list]);

    for (const item of receipt.items) {
      this._products.update((list) =>
        list.map((p) =>
          p.id === item.productId
            ? {
                ...p,
                stock: p.stock + item.quantity,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
              }
            : p,
        ),
      );
    }

    return mapped;
  }

  updateGoodsReceipt(
    id: string,
    changes: { supplier: string; note?: string; items: GoodsReceipt['items'] },
  ): void {
    this._goodsReceipts.update((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              supplier: changes.supplier.trim() || 'Nepoznat',
              note: changes.note,
              items: changes.items,
              totalCost: changes.items.reduce((s, i) => s + i.quantity * i.costPrice, 0),
            }
          : r,
      ),
    );

    // Update product prices to match edited receipt
    for (const item of changes.items) {
      this._products.update((list) =>
        list.map((p) =>
          p.id === item.productId
            ? { ...p, costPrice: item.costPrice, sellingPrice: item.sellingPrice }
            : p,
        ),
      );
    }
  }

  async recordInventoryCount(items: InventoryCount['items']): Promise<InventoryCount> {
    const created = await firstValueFrom(
      this.http.post<ApiInventoryCount>(`${BASE}/stock/inventory-counts`, { items }),
    );
    const mapped = mapInventoryCount(created);
    this._inventoryCounts.update((list) => [mapped, ...list]);

    for (const item of items) {
      this._products.update((list) =>
        list.map((p) => (p.id === item.productId ? { ...p, stock: item.actualStock } : p)),
      );
    }

    return mapped;
  }

  // ── Sync compatibility getters ─────────────────────────────────────────────
  getProducts(): Product[] { return this._products(); }
  getSales(): Sale[] { return this._sales(); }
  getInventoryCounts(): InventoryCount[] { return this._inventoryCounts(); }
  getStockChanges(): StockChange[] { return this._stockChanges(); }
  getGoodsReceipts(): GoodsReceipt[] { return this._goodsReceipts(); }
  getCustomers(): Customer[] { return this._customers(); }
  getSuppliers(): Supplier[] { return this._suppliers(); }

  getSalesForPeriod(period: DashboardPeriod): Sale[] {
    return this.salesByPeriod()[period];
  }

  getLowStockProducts(): Product[] {
    return this.lowStockProducts();
  }

  getDashboardSummary(period: DashboardPeriod): DashboardSummary {
    return this.dashboardSummaryByPeriod()[period];
  }

  getDashboardCards(period: DashboardPeriod): DashboardStatCard[] {
    return this.dashboardCardsByPeriod()[period];
  }

  describeSaleItems(saleId: string): string {
    return this.saleItemsLabelById()[saleId] ?? '';
  }

  getCustomerStats(customerId: string) {
    return (
      this.customerStatsById()[customerId] ?? {
        salesCount: 0,
        totalSpent: 0,
        totalProfit: 0,
        sales: [],
      }
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private fmt(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  private toProductDto(product: Omit<Product, 'id'> | Product) {
    return {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      description: product.description,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      bulkPrice: product.bulkPrice,
      bulkMinQty: product.bulkMinQty,
      unit: product.unit,
      packSize: product.packSize,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      status: product.status,
      image: product.image,
      expiryDate: product.expiryDate,
      warrantyMonths: product.warrantyMonths,
      variants: product.variants,
    };
  }

  private toCustomerDto(customer: Omit<Customer, 'id' | 'createdAt'> | Customer) {
    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      note: customer.note,
      discountType: customer.defaultDiscount?.type,
      discountValue: customer.defaultDiscount?.value,
    };
  }
}
