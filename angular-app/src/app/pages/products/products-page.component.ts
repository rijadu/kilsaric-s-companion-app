import { FormsModule } from '@angular/forms';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';
import { SnackbarService } from '../../shared/snackbar.service';
import { ProductCardComponent } from './product-card.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [FormsModule, RouterLink, ProductCardComponent],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.css',
})
export class ProductsPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly snackbar = inject(SnackbarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly allProducts = this.store.products;

  protected readonly search = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly selectedSubcategory = signal<string | null>(null);
  protected readonly correctionProductId = signal<string | null>(null);
  protected readonly correctionQty = signal('');
  protected readonly correctionNote = signal('');
  protected readonly categories = this.store.availableCategories;

  protected readonly activeSubcategories = computed(() => {
    const category = this.selectedCategory();
    return category
      ? this.store.availableSubcategories[category] ?? []
      : [];
  });

  protected readonly lowStockOnly = computed(
    () => this.queryParams().get('filter') === 'low-stock',
  );

  constructor() {
    effect(() => {
      const saved = this.queryParams().get('saved');
      if (!saved) return;
      if (saved === 'created') this.snackbar.success('Proizvod je dodat.');
      if (saved === 'updated') this.snackbar.success('Izmene proizvoda su sačuvane.');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { saved: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  protected readonly products = computed(() => {
    const term = this.search().trim().toLowerCase();
    const category = this.selectedCategory();
    const subcategory = this.selectedSubcategory();
    const lowStockOnly = this.lowStockOnly();

    return this.allProducts().filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode.includes(term);
      const matchesCategory = !category || product.category === category;
      const matchesSubcategory = !subcategory || product.subcategory === subcategory;
      const matchesLowStock =
        !lowStockOnly || product.stock <= product.lowStockThreshold;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSubcategory &&
        matchesLowStock
      );
    });
  });

  protected selectCategory(category: string | null): void {
    this.selectedCategory.set(
      category === this.selectedCategory() ? null : category,
    );
    this.selectedSubcategory.set(null);
  }

  protected selectSubcategory(subcategory: string | null): void {
    this.selectedSubcategory.set(
      subcategory === this.selectedSubcategory() ? null : subcategory,
    );
  }

  protected clearLowStockFilter(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected async deleteProduct(id: string, name: string): Promise<void> {
    if (!confirm(`Obrisati "${name}"? Ova radnja se ne može poništiti.`)) return;
    await this.store.deleteProduct(id);
    this.snackbar.success(`"${name}" je obrisan.`);
    this.correctionProductId.set(null);
  }

  protected toggleCorrection(productId: string): void {
    this.correctionProductId.set(
      this.correctionProductId() === productId ? null : productId,
    );
    this.correctionQty.set('');
    this.correctionNote.set('');
  }

  protected updateCorrectionValue(field: 'qty' | 'note', value: string): void {
    if (field === 'qty') {
      this.correctionQty.set(value);
      return;
    }

    this.correctionNote.set(value);
  }

  protected async applyCorrection(product: Product, positive: boolean): Promise<void> {
    const parsedQty = Number.parseInt(this.correctionQty(), 10);
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      this.snackbar.error('Unesite ispravnu količinu za korekciju.');
      return;
    }

    const quantity = positive ? parsedQty : -parsedQty;
    const fallbackNote = positive ? 'Ručno dodavanje' : 'Ručno skidanje';
    const result = await this.store.applyStockCorrection(
      product.id,
      quantity,
      this.correctionNote().trim() || fallbackNote,
    );

    if (!result) {
      this.snackbar.error('Proizvod nije pronađen za korekciju.');
      return;
    }

    this.snackbar.success(`Zaliha je ažurirana: ${product.name} → ${result.newStock}.`);
    this.toggleCorrection(product.id);
  }
}
