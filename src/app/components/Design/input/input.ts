import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class AppInput {
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input<'text' | 'url' | 'number'>('text');
  readonly value = input('');
  readonly required = input(false);
  readonly multiline = input(false);
  readonly rows = input(3);

  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    this.valueChange.emit(target.value);
  }
}
