import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface DialogState {
  isOpen: boolean;
  options: DialogOptions;
  promise: Promise<boolean>;
  resolve?: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly state = signal<DialogState | null>(null);

  async confirm(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      let dialogPromise: Promise<boolean>;
      let resolveDialog: ((value: boolean) => void) | undefined;

      dialogPromise = new Promise((res) => {
        resolveDialog = res;
      });

      this.state.set({
        isOpen: true,
        options,
        promise: dialogPromise,
        resolve: resolveDialog,
      });

      // Return the promise that will be resolved when user confirms/cancels
      return dialogPromise.then((result) => {
        this.state.set(null);
        resolve(result);
      });
    });
  }

  close(result: boolean): void {
    const current = this.state();
    if (current?.resolve) {
      current.resolve(result);
    }
  }
}
