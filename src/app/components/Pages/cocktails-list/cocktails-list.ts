import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon } from '../../Design/icon/icon';
import { RoundButton } from '../../Design/buttons/round-button/round-button';
import { Loading } from '../../Design/loading/loading';
import { SearchBar } from '../../Design/search-bar/search-bar';
import { Pagination } from '../../Design/pagination/pagination';
import { CocktailsService, SortDir } from '../../../Services/cocktails.service';
import { Cocktail } from '../../../shared/Models/cocktail.model';
import { SortBy, Sorting } from '../../Design/sorting/sorting';
import {
  AddCocktailForm,
  NewCocktailFormValue,
} from '../../Design/add-cocktail-form/add-cocktail-form';

@Component({
  selector: 'app-cocktails-list',
  standalone: true,
  imports: [Icon, RoundButton, Pagination, Loading, Sorting, SearchBar, AddCocktailForm],
  templateUrl: './cocktails-list.html',
  styleUrl: './cocktails-list.scss',
})
export class CocktailsList {
  private readonly cocktailsService = inject(CocktailsService);
  private readonly mockStorageKey = 'cocktails.mock.items.v1';
  private readonly pageStorageKey = 'cocktails.page.v1';
  @ViewChild('cocktailsListEl') private cocktailsListEl?: ElementRef<HTMLUListElement>;
  private readonly restoreListFocusPending = signal(false);

  cocktailSelected = output<Cocktail | null>();
  loadingChange = output<boolean>();
  preselectedId = input<Cocktail['id'] | null>(null);

  readonly selectedId = signal<Cocktail['id'] | null>(null);
  readonly currentPage = signal(this.readStoredPage());
  readonly searchTerm = signal('');
  readonly alcoholicOnly = signal(true);
  readonly sortBy = signal<SortBy>('alcoholic');
  readonly sortDir = signal<SortDir>('asc');
  readonly alcoholicSortDir = signal<SortDir>('asc');
  readonly createdAtSortDir = signal<SortDir>('asc');
  readonly pageSize = 10;
  readonly showAddCocktailModal = signal(false);
  readonly editingCocktailId = signal<Cocktail['id'] | null>(null);
  readonly formSeed = signal<NewCocktailFormValue | null>(null);
  readonly localCocktails = signal<Cocktail[]>([]);
  readonly localEdits = signal<Record<string, Cocktail>>({});
  readonly isSearchMode = computed(() => !!this.searchTerm().trim());
  readonly cocktailsResource = this.cocktailsService.createCocktailsResource(
    () => ({
      page: this.currentPage(),
      perPage: this.pageSize,
      alcoholic: this.preselectedId() == null ? this.alcoholicOnly() : undefined,
      sortBy: this.sortBy(),
      sortDir: this.sortDir(),
    }),
    { data: [] },
  );
  readonly cocktailsAutocompleteResource = this.cocktailsService.createCocktailsAutocompleteResource(
    () => this.searchTerm(),
    { data: [] },
  );
  readonly preselectedCocktailResource = this.cocktailsService.createCocktailByIdResource(() =>
    this.preselectedId(),
  );

  readonly filteredLocalCocktails = computed(() =>
    this.localCocktails().filter((cocktail) => this.matchesCurrentFilters(cocktail)),
  );

  readonly remoteCocktails = computed(() =>
    this.isSearchMode()
      ? (this.cocktailsAutocompleteResource.value().data ?? [])
      : (this.cocktailsResource.value().data ?? []),
  );

  readonly cocktails = computed(() => {
    const edits = this.localEdits();
    const base = [...this.filteredLocalCocktails(), ...this.remoteCocktails()];
    const preselected = this.preselectedCocktailResource.value();
    const withPreselected =
      preselected && !base.some((cocktail) => String(cocktail.id) === String(preselected.id))
        ? [preselected, ...base]
        : base;
    const merged = withPreselected.map(
      (cocktail) => edits[String(cocktail.id)] ?? cocktail,
    );
    const filtered = merged.filter((cocktail) => this.matchesCurrentFilters(cocktail));
    return this.sortCocktails(filtered);
  });
  readonly loading = computed(() =>
    this.isSearchMode() ? this.cocktailsAutocompleteResource.isLoading() : this.cocktailsResource.isLoading(),
  );
  readonly error = computed(() =>
    (this.isSearchMode() ? this.cocktailsAutocompleteResource.error() : this.cocktailsResource.error())
      ? 'Impossible de charger les cocktails.'
      : null,
  );
  readonly totalPages = computed(
    () => {
      const source = this.isSearchMode()
        ? this.cocktailsAutocompleteResource.value()
        : this.cocktailsResource.value();
      return source.pagination?.pages ?? source.meta?.totalPages ?? 1;
    },
  );
  readonly totalCount = computed(
    () => {
      const source = this.isSearchMode()
        ? this.cocktailsAutocompleteResource.value()
        : this.cocktailsResource.value();
      const remoteCount = source.pagination?.count ?? source.meta?.totalItems ?? source.data?.length ?? 0;
      return remoteCount + this.filteredLocalCocktails().length;
    },
  );
  readonly isEditMode = computed(() => this.editingCocktailId() != null);

  constructor() {
    this.loadMockCocktails();
    effect(() => {
      this.loadingChange.emit(this.loading());
    });
    effect(() => {
      this.persistCurrentPage(this.currentPage());
    });
    effect(() => {
      if (!this.restoreListFocusPending() || this.loading()) return;
      queueMicrotask(() => this.cocktailsListEl?.nativeElement.focus());
      this.restoreListFocusPending.set(false);
    });
    effect(() => {
      const preselected = this.preselectedId();
      if (preselected == null) return;
      if (this.sortBy() !== 'created_at') this.sortBy.set('created_at');
      if (this.sortDir() !== 'asc') this.sortDir.set('asc');
      if (this.createdAtSortDir() !== 'asc') this.createdAtSortDir.set('asc');
    });
    effect(() => {
      const preselected = this.preselectedId();
      const items = this.cocktails();
      const currentSelectedId = this.selectedId();

      if (items.length === 0) {
        this.selectedId.set(null);
        return;
      }

      if (preselected != null) {
        const match = items.find((cocktail) => String(cocktail.id) === String(preselected));
        if (match && currentSelectedId !== match.id) {
          this.select(match);
        }
        return;
      }

      if (
        currentSelectedId != null &&
        !items.some((cocktail) => String(cocktail.id) === String(currentSelectedId))
      ) {
        this.resetSelection();
      }
    });
  }

  private resetSelection(): void {
    this.selectedId.set(null);
    this.cocktailSelected.emit(null);
  }

  onPageChange(page: number, keepListFocus = false): void {
    this.resetSelection();
    this.currentPage.set(page);
    if (keepListFocus) {
      this.restoreListFocusPending.set(true);
    }
  }

  resetPagination(): void {
    if (this.currentPage() !== 1) {
      this.currentPage.set(1);
    }
    this.resetSelection();
    this.restoreListFocusPending.set(true);
  }

  toggleAlcoholic(): void {
    this.resetSelection();
    this.alcoholicOnly.update((value) => !value);
    this.currentPage.set(1);
  }

  applySearch(term: string): void {
    this.resetSelection();
    this.searchTerm.set(term.trim());
    this.currentPage.set(1);
  }

  toggleAlcoholicSort(): void {
    this.resetSelection();
    const nextDir = this.sortBy() === 'alcoholic' && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.alcoholicSortDir.set(nextDir);
    this.sortBy.set('alcoholic');
    this.sortDir.set(nextDir);
    this.currentPage.set(1);
  }

  toggleCreatedAtSort(): void {
    this.resetSelection();
    const nextDir = this.sortBy() === 'created_at' && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.createdAtSortDir.set(nextDir);
    this.sortBy.set('created_at');
    this.sortDir.set(nextDir);
    this.currentPage.set(1);
  }

  onListKeydown(event: KeyboardEvent): void {
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

    const items = this.cocktails();
    if (items.length === 0) return;

    const selectedId = this.selectedId();
    const currentIndex = items.findIndex((cocktail) => String(cocktail.id) === String(selectedId));
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    let nextIndex = fallbackIndex;

    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(fallbackIndex + 1, items.length - 1);
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(fallbackIndex - 1, 0);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.select(items[nextIndex]);
  }

  select(c: Cocktail): void {
    this.selectedId.set(c.id);
    this.cocktailSelected.emit(c);
  }

  openAddCocktailModal(): void {
    this.editingCocktailId.set(null);
    this.formSeed.set(this.toFormValue(null));
    this.showAddCocktailModal.set(true);
  }

  closeAddCocktailModal(): void {
    this.showAddCocktailModal.set(false);
    this.editingCocktailId.set(null);
    this.formSeed.set(null);
  }

  openEditCocktailModal(cocktail: Cocktail): void {
    this.editingCocktailId.set(cocktail.id);
    this.formSeed.set(this.toFormValue(cocktail));
    this.showAddCocktailModal.set(true);
  }

  onCocktailCreated(payload: NewCocktailFormValue): void {
    const editingId = this.editingCocktailId();
    if (editingId != null) {
      this.applyCocktailEdit(editingId, payload);
      return;
    }

    const created: Cocktail = {
      id: `local-${Date.now()}`,
      name: payload.name,
      created_at: new Date(),
      imageUrl: payload.imageUrl,
      category: payload.category,
      glass: payload.glass,
      alcoholic: payload.alcoholic,
      instructions: payload.instructions,
      description: payload.description,
      ingredients: payload.ingredients.map((name) => ({ name })),
      tags: payload.tags,
    };

    this.localCocktails.update((current) => [created, ...current]);
    this.persistMockCocktails();
    this.ensureListMatchesCocktail(created);
    this.closeAddCocktailModal();
    this.select(created);
  }

  private applyCocktailEdit(id: Cocktail['id'], payload: NewCocktailFormValue): void {
    const source = this.cocktails().find((cocktail) => String(cocktail.id) === String(id));
    if (!source) {
      this.closeAddCocktailModal();
      return;
    }

    const updated: Cocktail = {
      ...source,
      name: payload.name,
      imageUrl: payload.imageUrl,
      category: payload.category,
      glass: payload.glass,
      alcoholic: payload.alcoholic,
      instructions: payload.instructions,
      description: payload.description,
      ingredients: payload.ingredients.map((name) => ({ name })),
      tags: payload.tags,
    };

    this.localCocktails.update((items) =>
      items.map((cocktail) => (String(cocktail.id) === String(id) ? updated : cocktail)),
    );
    this.localEdits.update((edits) => ({ ...edits, [String(id)]: updated }));
    this.persistMockCocktails();
    this.ensureListMatchesCocktail(updated);
    this.closeAddCocktailModal();
    this.select(updated);
  }

  private ensureListMatchesCocktail(cocktail: Cocktail): void {
    if (this.preselectedId() != null) return;
    if (cocktail.alcoholic == null) return;
    if (this.alcoholicOnly() !== cocktail.alcoholic) {
      this.alcoholicOnly.set(cocktail.alcoholic);
      this.currentPage.set(1);
    }
  }

  private matchesCurrentFilters(cocktail: Cocktail): boolean {
    if (this.preselectedId() == null) {
      const listAlcoholic = this.alcoholicOnly();
      const cocktailAlcoholic = cocktail.alcoholic ?? true;
      if (cocktailAlcoholic !== listAlcoholic) return false;
    }

    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return true;

    const name = cocktail.name.toLowerCase();
    const category = (cocktail.category ?? '').toLowerCase();
    const glass = (cocktail.glass ?? '').toLowerCase();
    const tags = (cocktail.tags ?? []).join(' ').toLowerCase();

    return (
      name.includes(term) || category.includes(term) || glass.includes(term) || tags.includes(term)
    );
  }

  private sortCocktails(items: Cocktail[]): Cocktail[] {
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const by = this.sortBy();
    const toTimestamp = (value: Date | undefined): number =>
      value instanceof Date && !Number.isNaN(value.getTime()) ? value.getTime() : 0;
    const byName = (a: Cocktail, b: Cocktail): number => a.name.localeCompare(b.name);

    return [...items].sort((a, b) => {
      if (by === 'created_at') {
        const delta = toTimestamp(a.created_at) - toTimestamp(b.created_at);
        if (delta !== 0) return delta * dir;
        return byName(a, b) * dir;
      }

      const av = a.alcoholic === true ? 1 : 0;
      const bv = b.alcoholic === true ? 1 : 0;
      const alcoholicDelta = av - bv;
      if (alcoholicDelta !== 0) return alcoholicDelta * dir;
      return byName(a, b) * dir;
    });
  }

  private loadMockCocktails(): void {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(this.mockStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const items: Cocktail[] = parsed
          .map((item) => this.toMockCocktail(item))
          .filter((item): item is Cocktail => item !== null);
        this.localCocktails.set(items);
        this.localEdits.set({});
        return;
      }

      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        const locals = Array.isArray(record['locals']) ? record['locals'] : [];
        const edits = Array.isArray(record['edits']) ? record['edits'] : [];

        const localItems: Cocktail[] = locals
          .map((item) => this.toMockCocktail(item))
          .filter((item): item is Cocktail => item !== null);
        const editItems: Cocktail[] = edits
          .map((item) => this.toMockCocktail(item))
          .filter((item): item is Cocktail => item !== null);

        this.localCocktails.set(localItems);
        this.localEdits.set(
          editItems.reduce<Record<string, Cocktail>>((acc, item) => {
            acc[String(item.id)] = item;
            return acc;
          }, {}),
        );
      }
    } catch {
      this.localCocktails.set([]);
      this.localEdits.set({});
    }
  }

  private persistMockCocktails(): void {
    if (typeof window === 'undefined') return;
    const payload = {
      locals: this.localCocktails(),
      edits: Object.values(this.localEdits()),
    };
    window.localStorage.setItem(this.mockStorageKey, JSON.stringify(payload));
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

  private toFormValue(cocktail: Cocktail | null): NewCocktailFormValue {
    if (!cocktail) {
      return {
        name: '',
        imageUrl: '',
        category: '',
        glass: '',
        alcoholic: true,
        instructions: '',
        description: '',
        ingredients: [],
        tags: [],
      };
    }

    return {
      name: cocktail.name,
      imageUrl: cocktail.imageUrl || cocktail.image || '',
      category: cocktail.category || '',
      glass: cocktail.glass || '',
      alcoholic: cocktail.alcoholic ?? true,
      instructions: cocktail.instructions || '',
      description: cocktail.description || '',
      ingredients: cocktail.ingredients?.map((ingredient) => ingredient.name) ?? [],
      tags: cocktail.tags ?? [],
    };
  }

  private toMockCocktail(raw: unknown): Cocktail | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;

    const id = record['id'];
    const name = record['name'];
    const createdAt = record['created_at'];

    if ((typeof id !== 'string' && typeof id !== 'number') || typeof name !== 'string') {
      return null;
    }

    const ingredientsRaw = record['ingredients'];
    const tagsRaw = record['tags'];
    const ingredients = Array.isArray(ingredientsRaw)
      ? ingredientsRaw.reduce<Array<{ name: string; measure?: string }>>((acc, entry) => {
          if (!entry || typeof entry !== 'object') return acc;
          const ingredient = entry as Record<string, unknown>;
          const ingredientName = ingredient['name'];
          if (typeof ingredientName !== 'string') return acc;

          acc.push({
            name: ingredientName,
            measure: typeof ingredient['measure'] === 'string' ? ingredient['measure'] : undefined,
          });
          return acc;
        }, [])
      : undefined;

    return {
      id,
      name,
      created_at: createdAt ? new Date(String(createdAt)) : new Date(),
      imageUrl: typeof record['imageUrl'] === 'string' ? record['imageUrl'] : undefined,
      image: typeof record['image'] === 'string' ? record['image'] : undefined,
      category: typeof record['category'] === 'string' ? record['category'] : undefined,
      glass: typeof record['glass'] === 'string' ? record['glass'] : undefined,
      alcoholic: typeof record['alcoholic'] === 'boolean' ? record['alcoholic'] : undefined,
      instructions: typeof record['instructions'] === 'string' ? record['instructions'] : undefined,
      description: typeof record['description'] === 'string' ? record['description'] : undefined,
      ingredients,
      tags: Array.isArray(tagsRaw)
        ? tagsRaw.filter((tag): tag is string => typeof tag === 'string')
        : undefined,
    };
  }

  getImageUrl(cocktail: Cocktail): string | undefined {
    return cocktail.imageUrl || cocktail.image;
  }

  formatCreatedAt(value: Date): string {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    return value.toLocaleDateString();
  }
}
