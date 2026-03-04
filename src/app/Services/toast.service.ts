import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'warning' | 'error';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  private nextId = 1;

  success(message: string, durationMs = 3000): void {
    this.push('success', message, durationMs);
  }

  warning(message: string, durationMs = 3500): void {
    this.push('warning', message, durationMs);
  }

  error(message: string, durationMs = 4000): void {
    this.push('error', message, durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: ToastType, message: string, durationMs: number): void {
    const toast: ToastItem = { id: this.nextId++, type, message };
    this.toasts.update((items) => [toast, ...items].slice(0, 4));
    window.setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
