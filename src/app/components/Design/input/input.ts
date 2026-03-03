import { Component, effect, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.html',
  styleUrl: './input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInput),
      multi: true,
    },
  ],
})
export class AppInput implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input<'text' | 'url' | 'number'>('text');
  readonly value = input<string | undefined>(undefined);
  readonly required = input(false);
  readonly multiline = input(false);
  readonly rows = input(3);
  readonly disabled = signal(false);
  readonly innerValue = signal('');

  readonly valueChange = output<string>();

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const externalValue = this.value();
      if (externalValue === undefined) return;
      this.innerValue.set(externalValue);
    });
  }

  onInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const nextValue = target.value;
    this.innerValue.set(nextValue);
    this.valueChange.emit(nextValue);
    this.onChange(nextValue);
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.innerValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
