import { Component, inject } from '@angular/core';
import { ToastService } from '../../../Services/toast.service';

@Component({
  selector: 'app-toaster',
  standalone: true,
  templateUrl: './toaster.html',
  styleUrl: './toaster.scss',
})
export class Toaster {
  readonly toastService = inject(ToastService);
}
