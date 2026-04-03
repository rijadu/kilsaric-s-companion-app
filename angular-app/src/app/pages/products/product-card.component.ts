import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product, getMarginPercent } from '../../shared/mock-data';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  protected readonly margin = computed(() => getMarginPercent(this.product()));
  protected readonly isLowStock = computed(
    () => this.product().stock <= this.product().lowStockThreshold,
  );

  protected readonly unitLabelMap: Record<Product['unit'], string> = {
    piece: 'kom',
    kg: 'kg',
    meter: 'm',
    liter: 'L',
    box: 'kutija',
  };

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(value);
  }
}
