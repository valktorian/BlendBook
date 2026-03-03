import { Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoundButton } from '../buttons/round-button/round-button';
import { AppInput } from '../input/input';
import { Icon } from '../icon/icon';

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
  imports: [AppInput, RoundButton, Icon, ReactiveFormsModule],
  templateUrl: './add-cocktail-form.html',
  styleUrl: './add-cocktail-form.scss',
})
export class AddCocktailForm {
  readonly initialValue = input<NewCocktailFormValue | null>(null);
  readonly submitLabel = input('Ajouter le cocktail');
  readonly isSaveAction = computed(() => this.submitLabel().trim().toLowerCase() === 'enregistrer');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('', { nonNullable: true }),
    glass: new FormControl('', { nonNullable: true }),
    alcoholic: new FormControl(true, { nonNullable: true }),
    instructions: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    ingredientsText: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tagsText: new FormControl('', { nonNullable: true }),
  });

  readonly nameControl = this.form.controls.name;
  readonly imageUrlControl = this.form.controls.imageUrl;
  readonly categoryControl = this.form.controls.category;
  readonly glassControl = this.form.controls.glass;
  readonly alcoholicControl = this.form.controls.alcoholic;
  readonly instructionsControl = this.form.controls.instructions;
  readonly descriptionControl = this.form.controls.description;
  readonly ingredientsTextControl = this.form.controls.ingredientsText;
  readonly tagsTextControl = this.form.controls.tagsText;

  readonly submitCocktail = output<NewCocktailFormValue>();

  get isValid(): boolean {
    return this.form.valid;
  }

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (!value) {
        this.form.reset({
          name: '',
          imageUrl: '',
          category: '',
          glass: '',
          alcoholic: true,
          instructions: '',
          description: '',
          ingredientsText: '',
          tagsText: '',
        });
        return;
      }

      this.form.setValue({
        name: value.name ?? '',
        imageUrl: value.imageUrl ?? '',
        category: value.category ?? '',
        glass: value.glass ?? '',
        alcoholic: value.alcoholic ?? true,
        instructions: value.instructions ?? '',
        description: value.description ?? '',
        ingredientsText: (value.ingredients ?? []).join(', '),
        tagsText: (value.tags ?? []).join(', '),
      });
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.submitCocktail.emit({
      name: this.nameControl.value.trim(),
      imageUrl: this.imageUrlControl.value.trim(),
      category: this.categoryControl.value.trim(),
      glass: this.glassControl.value.trim(),
      alcoholic: this.alcoholicControl.value,
      instructions: this.instructionsControl.value.trim(),
      description: this.descriptionControl.value.trim(),
      ingredients: this.parseList(this.ingredientsTextControl.value),
      tags: this.parseList(this.tagsTextControl.value),
    });
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => !!part);
  }
}
