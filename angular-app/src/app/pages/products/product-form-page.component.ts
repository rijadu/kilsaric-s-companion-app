import { CommonModule, Location } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Product, Variant } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

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
  protected readonly submitted = signal(false);
  protected readonly pageMessage = signal<string | null>(null);
  protected readonly editingProductId = signal<string | null>(null);
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
    name: ['', Validators.required],
    sku: ['', Validators.required],
    barcode: [''],
    category: [''],
    subcategory: [''],
    brand: [''],
    description: [''],
    costPrice: [''],
    sellingPrice: ['', Validators.required],
    bulkPrice: [''],
    bulkMinQty: [''],
    unit: ['piece' as ProductUnit],
    packSize: [''],
    stock: ['0'],
    lowStockThreshold: ['0'],
    status: ['active' as ProductStatus],
    expiryDate: [''],
    warrantyMonths: [''],
    variants: this.fb.array([]),
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
        this.pageMessage.set('Proizvod nije pronađen. Vraćam na listu.');
        void this.router.navigate(['/products']);
        return;
      }

      this.patchProduct(product);
    });
  }

  protected get variants(): FormArray {
    return this.form.controls.variants;
  }

  protected addVariant(): void {
    this.variants.push(this.buildVariantGroup());
  }

  protected removeVariant(index: number): void {
    this.variants.removeAt(index);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.pageMessage.set(null);

    if (this.form.invalid) {
      this.pageMessage.set(
        'Popunite obavezna polja: naziv, SKU i prodajna cena.',
      );
      return;
    }

    const payload = this.buildProductPayload();
    if (!payload) {
      this.pageMessage.set('Forma nije mogla da se sačuva.');
      return;
    }

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

    await this.store.createProduct(payload);
    void this.router.navigate(['/products'], {
      queryParams: { saved: 'created' },
    });
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

  private resetForCreate(): void {
    this.pageMessage.set(null);
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
    this.variants.clear();
  }

  private patchProduct(product: Product): void {
    this.pageMessage.set(null);
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

    this.variants.clear();
    product.variants?.forEach((variant) => {
      this.variants.push(this.buildVariantGroup(variant));
    });
  }

  private buildVariantGroup(variant?: Variant) {
    return this.fb.nonNullable.group({
      id: [variant?.id ?? `v-new-${Date.now()}-${this.variants.length}`],
      name: [variant?.name ?? ''],
      sku: [variant?.sku ?? ''],
      barcode: [variant?.barcode ?? ''],
      stock: [variant ? String(variant.stock) : '0'],
      priceOverride: [variant?.priceOverride ? String(variant.priceOverride) : ''],
    });
  }

  private buildProductPayload(): Omit<Product, 'id'> | null {
    const raw = this.form.getRawValue();
    const sellingPrice = this.parseNumber(raw.sellingPrice);
    if (!raw.name.trim() || !raw.sku.trim() || sellingPrice <= 0) {
      return null;
    }

    const rawVariants = raw.variants as Array<{
      id: string;
      name: string;
      sku: string;
      barcode: string;
      stock: string;
      priceOverride: string;
    }>;

    const variants = rawVariants
      .map((variant) => ({
        id: variant.id,
        name: variant.name.trim(),
        sku: variant.sku.trim(),
        barcode: variant.barcode.trim() || undefined,
        stock: this.parseInteger(variant.stock),
        priceOverride: this.parseOptionalNumber(variant.priceOverride),
      }))
      .filter((variant) => variant.name || variant.sku);

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
      variants: variants.length > 0 ? variants : undefined,
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
