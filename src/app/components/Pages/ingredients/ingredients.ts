import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IngredientsService } from '../../../Services/ingredients.service';
import { Icon } from '../../Design/icon/icon';
import { Loading } from '../../Design/loading/loading';
import { Pagination } from '../../Design/pagination/pagination';
import { Ingredient } from '../../../shared/Models/ingredient.model';
import { SearchBar } from '../../Design/search-bar/search-bar';
import { RoundButton } from '../../Design/buttons/round-button/round-button';

@Component({
  selector: 'app-ingredients',
  standalone: true,
  imports: [Icon, Loading, Pagination, SearchBar, RoundButton],
  templateUrl: './ingredients.html',
  styleUrl: './ingredients.scss',
})
export class Ingredients {
  private readonly ingredientsService = inject(IngredientsService);
  private readonly route = inject(ActivatedRoute);
  private readonly pageStorageKey = 'ingredients.page.v1';
  @ViewChild('ingredientsListEl') private ingredientsListEl?: ElementRef<HTMLUListElement>;
  @ViewChild('ingredientDetailsEl') private ingredientDetailsEl?: ElementRef<HTMLDivElement>;
  private readonly restoreListFocusPending = signal(false);
  private readonly pendingPreselectedId = signal<string | null>(
    this.route.snapshot.queryParamMap.get('selected'),
  );

  readonly currentPage = signal(this.readStoredPage());
  readonly pageSize = 10;
  readonly searchTerm = signal('');
  readonly isSearchMode = computed(() => !!this.searchTerm().trim());
  readonly selectedIngredientId = signal<Ingredient['id'] | null>(null);
  readonly focusedIngredientId = signal<Ingredient['id'] | null>(null);

  readonly ingredientsResource = this.ingredientsService.createIngredientsResource(
    () => ({
      page: this.currentPage(),
      perPage: this.pageSize,
      sortBy: 'name',
      sortDir: 'asc',
    }),
    { data: [] },
  );
  readonly ingredientsAutocompleteResource =
    this.ingredientsService.createIngredientsAutocompleteResource(() => this.searchTerm(), {
      data: [],
    });

  readonly preselectedIngredientResource = this.ingredientsService.createIngredientByIdResource(() =>
    this.pendingPreselectedId(),
  );
  readonly ingredients = computed(() => {
    const base = this.isSearchMode()
      ? (this.ingredientsAutocompleteResource.value().data ?? [])
      : (this.ingredientsResource.value().data ?? []);
    const preselected = this.preselectedIngredientResource.value();
    if (!preselected) return base;
    const exists = base.some((ingredient) => String(ingredient.id) === String(preselected.id));
    return exists ? base : [preselected, ...base];
  });
  readonly ingredientDetailsResource = this.ingredientsService.createIngredientByIdResource(() =>
    this.selectedIngredientId(),
  );
  readonly selectedIngredient = computed(() => this.ingredientDetailsResource.value() ?? null);
  readonly loading = computed(() =>
    this.isSearchMode()
      ? this.ingredientsAutocompleteResource.isLoading()
      : this.ingredientsResource.isLoading(),
  );
  readonly error = computed(() =>
    (
      this.isSearchMode()
        ? this.ingredientsAutocompleteResource.error()
        : this.ingredientsResource.error()
    )
      ? 'Impossible de charger les ingredients.'
      : null,
  );
  readonly totalPages = computed(() => {
    const source = this.isSearchMode()
      ? this.ingredientsAutocompleteResource.value()
      : this.ingredientsResource.value();
    return source.pagination?.pages ?? source.meta?.totalPages ?? 1;
  });
  readonly totalCount = computed(() => {
    const source = this.isSearchMode()
      ? this.ingredientsAutocompleteResource.value()
      : this.ingredientsResource.value();
    return source.pagination?.count ?? source.meta?.totalItems ?? this.ingredients().length;
  });

  constructor() {
    this.bindSelectedFromRoute();
    effect(() => {
      this.ingredients();
      this.syncFocusedRow();
    });
    effect(() => {
      this.persistCurrentPage(this.currentPage());
    });
    effect(() => {
      if (!this.restoreListFocusPending() || this.loading()) return;
      queueMicrotask(() => this.ingredientsListEl?.nativeElement.focus());
      this.restoreListFocusPending.set(false);
    });
    effect(() => {
      const preselected = this.pendingPreselectedId();
      if (preselected == null || preselected === '') return;
      this.selectedIngredientId.set(preselected);
      this.focusedIngredientId.set(preselected);
    });
  }

  onPageChange(page: number, keepListFocus = false): void {
    this.currentPage.set(page);
    this.selectedIngredientId.set(null);
    this.focusedIngredientId.set(null);
    if (keepListFocus) {
      this.restoreListFocusPending.set(true);
    }
  }

  resetPagination(): void {
    this.currentPage.set(1);
    this.selectedIngredientId.set(null);
    this.focusedIngredientId.set(null);
  }

  toggleIngredientDetails(ingredient: Ingredient): void {
    const current = this.selectedIngredientId();
    this.selectedIngredientId.set(String(current) === String(ingredient.id) ? null : ingredient.id);
    this.focusedIngredientId.set(ingredient.id);
  }

  isExpanded(id: Ingredient['id']): boolean {
    return String(this.selectedIngredientId()) === String(id);
  }

  isFocused(id: Ingredient['id']): boolean {
    return String(this.focusedIngredientId()) === String(id);
  }

  setFocusedIngredient(id: Ingredient['id']): void {
    this.focusedIngredientId.set(id);
  }

  applySearch(term: string): void {
    this.searchTerm.set(term.trim());
    this.currentPage.set(1);
    this.selectedIngredientId.set(null);
    this.focusedIngredientId.set(null);
    this.syncFocusedRow();
  }

  onListKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.ingredient-details')) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      if (this.currentPage() > 1) {
        this.onPageChange(this.currentPage() - 1, true);
      }
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      if (this.currentPage() < this.totalPages()) {
        this.onPageChange(this.currentPage() + 1, true);
      }
      return;
    }

    const items = this.ingredients();
    if (items.length === 0) return;

    const focusedId = this.focusedIngredientId();
    const currentIndex = items.findIndex((item) => String(item.id) === String(focusedId));
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    let nextIndex = fallbackIndex;

    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(fallbackIndex + 1, items.length - 1);
      event.preventDefault();
      this.focusedIngredientId.set(items[nextIndex].id);
      return;
    }

    if (event.key === 'ArrowUp') {
      nextIndex = Math.max(fallbackIndex - 1, 0);
      event.preventDefault();
      this.focusedIngredientId.set(items[nextIndex].id);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const focusedItem = items[fallbackIndex];
      const openedId = this.selectedIngredientId();

      if (openedId == null) {
        this.selectedIngredientId.set(focusedItem.id);
        this.focusedIngredientId.set(focusedItem.id);
        this.focusIngredientDetailsArea();
        return;
      }

      if (String(openedId) === String(focusedItem.id)) {
        this.selectedIngredientId.set(null);
        this.focusedIngredientId.set(focusedItem.id);
        queueMicrotask(() => this.ingredientsListEl?.nativeElement.focus());
        return;
      }

      this.selectedIngredientId.set(focusedItem.id);
      this.focusedIngredientId.set(focusedItem.id);
      this.focusIngredientDetailsArea();
    }
  }

  onDetailsEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const openedId = this.selectedIngredientId();
    if (openedId != null) {
      this.selectedIngredientId.set(null);
      this.focusedIngredientId.set(openedId);
    }
    queueMicrotask(() => this.ingredientsListEl?.nativeElement.focus());
  }

  private focusIngredientDetailsArea(): void {
    const tryFocus = (attempt: number): void => {
      const el = this.ingredientDetailsEl?.nativeElement;
      if (el) {
        el.focus();
        return;
      }
      if (attempt < 5) {
        setTimeout(() => tryFocus(attempt + 1), 0);
      }
    };

    queueMicrotask(() => tryFocus(0));
  }

  private syncFocusedRow(): void {
    const items = this.ingredients();
    if (items.length === 0) {
      this.focusedIngredientId.set(null);
      return;
    }

    const focusedId = this.focusedIngredientId();
    const exists = items.some((item) => String(item.id) === String(focusedId));
    if (!exists) {
      this.focusedIngredientId.set(items[0].id);
    }
  }

  private bindSelectedFromRoute(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.pendingPreselectedId.set(params.get('selected'));
    });
  }

  private readStoredPage(): number {
    if (typeof window === 'undefined') return 1;
    const raw = window.localStorage.getItem(this.pageStorageKey);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
  }

  private persistCurrentPage(page: number): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.pageStorageKey, String(Math.max(1, Math.trunc(page))));
  }

  detailPoints(ingredient: Ingredient | null): Array<{ label: string; value: string }> {
    if (!ingredient) return [];
    return [
      { label: 'Name', value: ingredient.name || '-' },
      { label: 'Type', value: ingredient.type || '-' },
      {
        label: 'Alcohol',
        value: ingredient.containsAlcohol == null ? '-' : ingredient.containsAlcohol ? 'Yes' : 'No',
      },
      { label: 'ABV', value: ingredient.abv == null ? 'N/A' : `${ingredient.abv}%` },
      { label: 'Created', value: ingredient.createdAt || '-' },
      { label: 'Updated', value: ingredient.updatedAt || '-' },
    ];
  }
}
