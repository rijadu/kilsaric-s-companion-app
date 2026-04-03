import { Injectable, signal } from '@angular/core';

export interface SnackbarMessage {
  message: string;
  type: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly current = signal<SnackbarMessage | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: 'success' | 'error' = 'success', duration = 3000): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.current.set({ message, type });

    this.timer = setTimeout(() => {
      this.current.set(null);
      this.timer = null;
    }, duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }
}
