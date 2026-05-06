import { CommonModule, Location } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Product } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';
import { SnackbarService } from '../../shared/snackbar.service';

type ProductUnit = Product['unit'];
type ProductStatus = Product['status'];

@Component({
  selector: 'app-product-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form-page.component.html',
  styleUrl: './product-form-page.component.css',
})
export class ProductFormPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(MockStoreService);
  private readonly snackbar = inject(SnackbarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly isEdit = signal(false);
  protected readonly editingProductId = signal<string | null>(null);
  protected readonly saveInProgress = signal(false);
  protected readonly categories = this.store.availableCategories;
  protected readonly brands = this.store.availableBrands;
  protected readonly units: { value: ProductUnit; label: string }[] = [
    { value: 'piece', label: 'Komad' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'meter', label: 'Metar' },
    { value: 'liter', label: 'Litar' },
    { value: 'box', label: 'Kutija' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: [''],
    sku: [''],
    barcode: [''],
    category: [''],
    subcategory: [''],
    brand: [''],
    description: [''],
    costPrice: [''],
    sellingPrice: [''],
    bulkPrice: [''],
    bulkMinQty: [''],
    unit: ['piece' as ProductUnit],
    packSize: [''],
    stock: ['0'],
    lowStockThreshold: ['0'],
    status: ['active' as ProductStatus],
    expiryDate: [''],
    warrantyMonths: [''],
  });

  private readonly categoryValue = toSignal(
    this.form.controls.category.valueChanges,
    { initialValue: this.form.controls.category.value },
  );
  private readonly lastCategory = signal(this.form.controls.category.value);

  protected readonly activeSubcategories = computed(() => {
    const category = this.categoryValue();
    return category ? this.store.availableSubcategories[category] ?? [] : [];
  });

  protected readonly marginPreview = computed(() => {
    const costPrice = this.parseNumber(this.form.controls.costPrice.value);
    const sellingPrice = this.parseNumber(this.form.controls.sellingPrice.value);
    const bulkPrice = this.parseNumber(this.form.controls.bulkPrice.value);

    if (costPrice <= 0 || sellingPrice <= 0) {
      return null;
    }

    return {
      margin: ((sellingPrice - costPrice) / costPrice) * 100,
      profit: sellingPrice - costPrice,
      bulkMargin:
        bulkPrice > 0 ? ((bulkPrice - costPrice) / costPrice) * 100 : null,
    };
  });

  protected readonly currentProduct = computed(() => {
    const id = this.editingProductId();
    return id ? this.store.getProductById(id) : undefined;
  });

  protected readonly activeLots = computed(() => this.currentProduct()?.inventoryLots ?? []);
  protected readonly hasTrackedStock = computed(
    () => (this.currentProduct()?.stock ?? 0) > 0 || this.activeLots().length > 0,
  );

  constructor() {
    effect(() => {
      const category = this.categoryValue();
      const previousCategory = this.lastCategory();
      if (category !== previousCategory) {
        this.lastCategory.set(category);
        this.form.controls.subcategory.setValue('');
      }
    });

    effect(() => {
      const productId = this.routeParams().get('id');
      this.isEdit.set(!!productId);
      this.editingProductId.set(productId);

      if (!productId) {
        this.resetForCreate();
        const barcode = this.queryParams().get('barcode');
        if (barcode) {
          this.form.controls.barcode.setValue(barcode, { emitEvent: false });
        }
        return;
      }

      const product = this.store.getProductById(productId);
      if (!product) {
        this.snackbar.error('Proizvod nije pronađen.');
        void this.router.navigate(['/products']);
        return;
      }

      this.patchProduct(product);
    });
  }

  protected async save(): Promise<void> {
    if (this.saveInProgress()) return;

    const payload = this.buildProductPayload();
    this.saveInProgress.set(true);

    try {
      if (this.isEdit() && this.editingProductId()) {
        await this.store.updateProduct({
          ...payload,
          id: this.editingProductId()!,
        });
        void this.router.navigate(['/products'], {
          queryParams: { saved: 'updated' },
        });
        return;
      }

      const created = await this.store.createProduct(payload);
      void this.router.navigate(['/products'], {
        queryParams: { saved: 'created', productId: created.id },
      });
    } catch {
      this.snackbar.error('Proizvod nije sačuvan. Proverite podatke i pokušajte ponovo.');
    } finally {
      this.saveInProgress.set(false);
    }
  }

  protected goBack(): void {
    this.location.back();
  }

  protected setStatusActive(active: boolean): void {
    this.form.controls.status.setValue(active ? 'active' : 'inactive');
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected formatDateTime(value?: string): string {
    if (!value) return 'Ručno uneto';
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected lotSourceLabel(source: NonNullable<Product['inventoryLots']>[number]['sourceType']): string {
    switch (source) {
      case 'initial':
        return 'Početno stanje';
      case 'receipt':
        return 'Primka';
      case 'correction':
        return 'Korekcija';
      case 'inventory':
        return 'Inventura';
    }
  }

  private resetForCreate(): void {
    this.form.reset(
      {
        name: '',
        sku: '',
        barcode: '',
        category: '',
        subcategory: '',
        brand: '',
        description: '',
        costPrice: '',
        sellingPrice: '',
        bulkPrice: '',
        bulkMinQty: '',
        unit: 'piece',
        packSize: '',
        stock: '0',
        lowStockThreshold: '0',
        status: 'active',
        expiryDate: '',
        warrantyMonths: '',
      },
      { emitEvent: false },
    );
    this.lastCategory.set('');
  }

  private patchProduct(product: Product): void {
    this.form.patchValue(
      {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        subcategory: product.subcategory ?? '',
        brand: product.brand,
        description: product.description,
        costPrice: String(product.costPrice),
        sellingPrice: String(product.sellingPrice),
        bulkPrice: product.bulkPrice ? String(product.bulkPrice) : '',
        bulkMinQty: product.bulkMinQty ? String(product.bulkMinQty) : '',
        unit: product.unit,
        packSize: product.packSize ? String(product.packSize) : '',
        stock: String(product.stock),
        lowStockThreshold: String(product.lowStockThreshold),
        status: product.status,
        expiryDate: product.expiryDate ?? '',
        warrantyMonths: product.warrantyMonths ? String(product.warrantyMonths) : '',
      },
      { emitEvent: false },
    );
    this.lastCategory.set(product.category);
  }

  private buildProductPayload(): Omit<Product, 'id'> {
    const raw = this.form.getRawValue();
    const sellingPrice = this.parseNumber(raw.sellingPrice);

    return {
      name: raw.name.trim(),
      sku: raw.sku.trim(),
      barcode: raw.barcode.trim(),
      category: raw.category.trim(),
      subcategory: raw.subcategory.trim() || undefined,
      brand: raw.brand.trim(),
      description: raw.description.trim(),
      costPrice: this.parseNumber(raw.costPrice),
      sellingPrice,
      bulkPrice: this.parseOptionalNumber(raw.bulkPrice),
      bulkMinQty: this.parseOptionalInteger(raw.bulkMinQty),
      unit: raw.unit,
      packSize: this.parseOptionalInteger(raw.packSize),
      stock: this.parseInteger(raw.stock),
      lowStockThreshold: this.parseInteger(raw.lowStockThreshold),
      status: raw.status,
      expiryDate: raw.expiryDate || undefined,
      warrantyMonths: this.parseOptionalInteger(raw.warrantyMonths),
    };
  }

  private parseNumber(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseInteger(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseOptionalNumber(value: string): number | undefined {
    const parsed = this.parseNumber(value);
    return parsed > 0 ? parsed : undefined;
  }

  private parseOptionalInteger(value: string): number | undefined {
    const parsed = this.parseInteger(value);
    return parsed > 0 ? parsed : undefined;
  }
}
