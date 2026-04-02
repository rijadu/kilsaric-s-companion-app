import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { Customer } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';

type DiscountType = 'percent' | 'fixed';

interface CustomerFormValue {
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
}

const emptyCustomerForm: CustomerFormValue = {
  name: '',
  phone: '',
  email: '',
  address: '',
  note: '',
};

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customers-page.component.html',
  styleUrl: './customers-page.component.css',
})
export class CustomersPageComponent {
  private readonly store = inject(MockStoreService);
  protected readonly customers = this.store.customers;
  private readonly customerStatsById = this.store.customerStatsById;
  private readonly saleItemsLabelById = this.store.saleItemsLabelById;

  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<CustomerFormValue>({ ...emptyCustomerForm });
  protected readonly discountValue = signal('');
  protected readonly discountType = signal<DiscountType>('percent');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly pageMessage = signal<string | null>(null);

  protected readonly filteredCustomers = computed(() => {
    const query = this.search().trim().toLowerCase();
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

  protected readonly selectedCustomer = computed(() => {
    const id = this.selectedId();
    return id ? this.customers().find((customer) => customer.id === id) : undefined;
  });

  protected updateSearch(value: string): void {
    this.search.set(value);
  }

  protected openNew(): void {
    this.form.set({ ...emptyCustomerForm });
    this.discountValue.set('');
    this.discountType.set('percent');
    this.editingId.set(null);
    this.showForm.set(true);
    this.pageMessage.set(null);
  }

  protected openEdit(customer: Customer): void {
    this.form.set({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      note: customer.note ?? '',
    });
    this.discountValue.set(customer.defaultDiscount?.value?.toString() ?? '');
    this.discountType.set(customer.defaultDiscount?.type ?? 'percent');
    this.editingId.set(customer.id);
    this.showForm.set(true);
    this.pageMessage.set(null);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  protected updateForm<K extends keyof CustomerFormValue>(
    field: K,
    value: CustomerFormValue[K],
  ): void {
    this.form.update((current) => ({ ...current, [field]: value }));
  }

  protected toggleDiscountType(): void {
    this.discountType.set(this.discountType() === 'percent' ? 'fixed' : 'percent');
  }

  protected updateDiscountValue(value: string): void {
    this.discountValue.set(value);
  }

  protected async save(): Promise<void> {
    const form = this.form();
    if (!form.name.trim()) {
      this.pageMessage.set('Unesite ime kupca.');
      return;
    }

    const parsedDiscount = Number.parseFloat(this.discountValue().replace(',', '.'));
    const defaultDiscount =
      Number.isFinite(parsedDiscount) && parsedDiscount > 0
        ? { type: this.discountType(), value: parsedDiscount }
        : undefined;

    if (this.editingId()) {
      await this.store.updateCustomer({
        id: this.editingId()!,
        createdAt: this.store.getCustomerById(this.editingId()!)?.createdAt ?? new Date().toISOString(),
        ...form,
        defaultDiscount,
      });
      this.pageMessage.set('Kupac je ažuriran.');
    } else {
      await this.store.createCustomer({
        ...form,
        defaultDiscount,
      });
      this.pageMessage.set('Kupac dodat.');
    }

    this.closeForm();
  }

  protected async deleteCustomer(id: string): Promise<void> {
    const name = this.customers().find((c) => c.id === id)?.name ?? 'ovog kupca';
    if (!confirm(`Obrisati ${name}? Ova radnja se ne može poništiti.`)) return;
    await this.store.deleteCustomer(id);
    if (this.selectedId() === id) {
      this.selectedId.set(null);
    }
    this.pageMessage.set('Kupac je obrisan.');
  }

  protected toggleSelected(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  protected clearSelected(): void {
    this.selectedId.set(null);
  }

  protected customerStats(customerId: string) {
    return this.customerStatsById()[customerId] ?? {
      salesCount: 0,
      totalSpent: 0,
      totalProfit: 0,
      sales: [],
    };
  }

  protected saleItemsSummary(_customerId: string, saleId: string): string {
    return this.saleItemsLabelById()[saleId] ?? '';
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS').format(Math.round(value));
  }

  protected formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(value));
  }
}
