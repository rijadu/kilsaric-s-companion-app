import { Component, inject } from '@angular/core';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.css',
})
export class DialogComponent {
  protected readonly dialog = inject(DialogService);

  protected onConfirm(): void {
    this.dialog.close(true);
  }

  protected onCancel(): void {
    this.dialog.close(false);
  }
}
