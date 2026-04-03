import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MockStoreService } from '../shared/mock-store.service';
import { SnackbarService } from '../shared/snackbar.service';

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  exact?: boolean;
  emphasis?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  protected readonly store = inject(MockStoreService);
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly snackbar = inject(SnackbarService);

  protected readonly navItems: NavItem[] = [
    { path: '/', label: 'Početna', shortLabel: 'PO', exact: true },
    { path: '/products', label: 'Proizvodi', shortLabel: 'PR' },
    { path: '/pos', label: 'Prodaja', shortLabel: 'KA', emphasis: true },
    { path: '/goods-receipt', label: 'Nabavka', shortLabel: 'NA' },
    { path: '/history', label: 'Istorija', shortLabel: 'IS' },
  ];
}
