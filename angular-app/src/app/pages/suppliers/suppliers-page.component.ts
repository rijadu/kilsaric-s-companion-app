import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { Supplier } from '../../shared/mock-data';
import { MockStoreService } from '../../shared/mock-store.service';
import { SnackbarService } from '../../shared/snackbar.service';

interface SupplierFormValue {
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  products: string;
}

const emptySupplierForm: SupplierFormValue = {
  name: '',
  phone: '',
  email: '',
  address: '',
  note: '',
  products: '',
};

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.css',
})
export class SuppliersPageComponent {
  private readonly store = inject(MockStoreService);
  private readonly snackbar = inject(SnackbarService);
  protected readonly suppliers = this.store.suppliers;

  protected readonly search = signal('');
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<SupplierFormValue>({ ...emptySupplierForm });
  protected readonly selectedId = signal<string | null>(null);

  protected readonly filteredSuppliers = computed(() => {
    const query = this.search().trim().toLowerCase();
    const suppliers = this.suppliers();
    if (!query) {
      return suppliers;
    }

    return suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(query) ||
        supplier.phone?.includes(query),
    );
  });

  protected readonly selectedSupplier = computed(() => {
    const id = this.selectedId();
    return id ? this.suppliers().find((supplier) => supplier.id === id) : undefined;
  });

  protected updateSearch(value: string): void {
    this.search.set(value);
  }

  protected openNew(): void {
    this.form.set({ ...emptySupplierForm });
    this.editingId.set(null);
    this.showForm.set(true);
  }

  protected openEdit(supplier: Supplier): void {
    this.form.set({
      name: supplier.name,
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      note: supplier.note ?? '',
      products: supplier.products?.join(', ') ?? '',
    });
    this.editingId.set(supplier.id);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  protected updateForm<K extends keyof SupplierFormValue>(
    field: K,
    value: SupplierFormValue[K],
  ): void {
    this.form.update((current) => ({ ...current, [field]: value }));
  }

  protected async save(): Promise<void> {
    const form = this.form();
    if (!form.name.trim()) {
      this.snackbar.error('Unesite ime dobavljača.');
      return;
    }

    const products = form.products
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (this.editingId()) {
      await this.store.updateSupplier({
        id: this.editingId()!,
        createdAt: this.store.getSupplierById(this.editingId()!)?.createdAt ?? new Date().toISOString(),
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
        products,
      });
      this.snackbar.success('Dobavljač je ažuriran.');
    } else {
      await this.store.createSupplier({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
        products,
      });
      this.snackbar.success('Dobavljač je dodat.');
    }

    this.closeForm();
  }

  protected async deleteSupplier(id: string): Promise<void> {
    const name = this.suppliers().find((s) => s.id === id)?.name ?? 'ovog dobavljača';
    if (!confirm(`Obrisati ${name}? Ova radnja se ne može poništiti.`)) return;
    await this.store.deleteSupplier(id);
    if (this.selectedId() === id) {
      this.selectedId.set(null);
    }
    this.snackbar.success('Dobavljač je obrisan.');
  }

  protected toggleSelected(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  protected clearSelected(): void {
    this.selectedId.set(null);
  }
}
