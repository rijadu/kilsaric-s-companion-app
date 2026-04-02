import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';

const featureRoutes: Routes = [
  {
    path: 'stock',
    loadComponent: () =>
      import('./pages/stock/stock-table-page.component').then(
        (module) => module.StockTablePageComponent,
      ),
    title: 'Tabela zaliha',
  },
  {
    path: 'pos',
    loadComponent: () =>
      import('./pages/pos/pos-page.component').then(
        (module) => module.PosPageComponent,
      ),
    title: 'Prodaja',
  },
  {
    path: 'goods-receipt',
    loadComponent: () =>
      import('./pages/goods-receipt/goods-receipt-page.component').then(
        (module) => module.GoodsReceiptPageComponent,
      ),
    title: 'Nabavka',
  },
  {
    path: 'goods-receipt/new',
    loadComponent: () =>
      import('./pages/goods-receipt/goods-receipt-form-page.component').then(
        (module) => module.GoodsReceiptFormPageComponent,
      ),
    title: 'Nova nabavka',
  },
  {
    path: 'goods-receipt/edit/:id',
    loadComponent: () =>
      import('./pages/goods-receipt/goods-receipt-form-page.component').then(
        (module) => module.GoodsReceiptFormPageComponent,
      ),
    title: 'Izmena nabavke',
  },
];

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        component: DashboardPageComponent,
        title: 'Početna',
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./pages/products/product-form-page.component').then(
            (module) => module.ProductFormPageComponent,
          ),
        title: 'Novi proizvod',
      },
      {
        path: 'products/edit/:id',
        loadComponent: () =>
          import('./pages/products/product-form-page.component').then(
            (module) => module.ProductFormPageComponent,
          ),
        title: 'Izmena proizvoda',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products/products-page.component').then(
            (module) => module.ProductsPageComponent,
          ),
        title: 'Proizvodi',
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./pages/history/sales-history-page.component').then(
            (module) => module.SalesHistoryPageComponent,
          ),
        title: 'Istorija prodaje',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/reports-page.component').then(
            (module) => module.ReportsPageComponent,
          ),
        title: 'Izveštaji',
      },
      {
        path: 'inventory-count',
        loadComponent: () =>
          import('./pages/inventory/inventory-count-page.component').then(
            (module) => module.InventoryCountPageComponent,
          ),
        title: 'Popis',
      },
      {
        path: 'stock-history',
        loadComponent: () =>
          import('./pages/stock/stock-history-page.component').then(
            (module) => module.StockHistoryPageComponent,
          ),
        title: 'Istorija zaliha',
      },
      {
        path: 'daily-close',
        loadComponent: () =>
          import('./pages/daily-close/daily-close-page.component').then(
            (module) => module.DailyClosePageComponent,
          ),
        title: 'Dnevni presek',
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./pages/customers/customers-page.component').then(
            (module) => module.CustomersPageComponent,
          ),
        title: 'Kupci',
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./pages/suppliers/suppliers-page.component').then(
            (module) => module.SuppliersPageComponent,
          ),
        title: 'Dobavljači',
      },
      ...featureRoutes,
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
