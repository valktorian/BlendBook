import { Component, effect, input, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-search-bar',
  imports: [Icon],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar {
  readonly value = input('');
  readonly placeholder = input('Rechercher...');
  readonly submitted = output<string>();

  readonly query = signal('');

  constructor() {
    effect(() => {
      this.query.set(this.value());
    });
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.query.set(value);
    this.submit();
  }

  submit(): void {
    this.submitted.emit(this.query().trim());
  }
}
