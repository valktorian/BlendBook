import { Component, computed, effect, input, output, signal } from '@angular/core';
import { RoundButton } from '../buttons/round-button/round-button';
import { AppInput } from '../input/input';

export interface NewCocktailFormValue {
  name: string;
  imageUrl?: string;
  category?: string;
  glass?: string;
  alcoholic: boolean;
  instructions: string;
  description?: string;
  ingredients: string[];
  tags: string[];
}

@Component({
  selector: 'app-add-cocktail-form',
  standalone: true,
  imports: [AppInput, RoundButton],
  templateUrl: './add-cocktail-form.html',
  styleUrl: './add-cocktail-form.scss',
})
export class AddCocktailForm {
  readonly initialValue = input<NewCocktailFormValue | null>(null);
  readonly submitLabel = input('Ajouter le cocktail');

  readonly name = signal('');
  readonly imageUrl = signal('');
  readonly category = signal('');
  readonly glass = signal('');
  readonly instructions = signal('');
  readonly description = signal('');
  readonly ingredientsText = signal('');
  readonly tagsText = signal('');
  readonly alcoholic = signal(true);

  readonly submitCocktail = output<NewCocktailFormValue>();
  readonly isValid = computed(() => !!this.name().trim() && !!this.instructions().trim());

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (!value) return;

      this.name.set(value.name ?? '');
      this.imageUrl.set(value.imageUrl ?? '');
      this.category.set(value.category ?? '');
      this.glass.set(value.glass ?? '');
      this.alcoholic.set(value.alcoholic ?? true);
      this.instructions.set(value.instructions ?? '');
      this.description.set(value.description ?? '');
      this.ingredientsText.set((value.ingredients ?? []).join(', '));
      this.tagsText.set((value.tags ?? []).join(', '));
    });
  }

  submit(): void {
    if (!this.isValid()) return;

    this.submitCocktail.emit({
      name: this.name().trim(),
      imageUrl: this.toOptional(this.imageUrl()),
      category: this.toOptional(this.category()),
      glass: this.toOptional(this.glass()),
      alcoholic: this.alcoholic(),
      instructions: this.instructions().trim(),
      description: this.toOptional(this.description()),
      ingredients: this.parseList(this.ingredientsText()),
      tags: this.parseList(this.tagsText()),
    });
  }

  private toOptional(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => !!part);
  }
}
