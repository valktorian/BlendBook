import { Injectable, computed, signal } from '@angular/core';
import { Cocktail } from '../shared/Models/cocktail.model';

@Injectable()
export class LikedCocktailsService {
  private readonly storageKey = 'cocktails.liked.v1';
  private readonly liked = signal<Cocktail[]>(this.readFromStorage());

  readonly likedCocktails = computed(() => this.liked());
  readonly likedCount = computed(() => this.liked().length);

  isLiked(id: Cocktail['id'] | null | undefined): boolean {
    if (id == null) return false;
    return this.liked().some((cocktail) => String(cocktail.id) === String(id));
  }

  toggle(cocktail: Cocktail): void {
    if (this.isLiked(cocktail.id)) {
      this.remove(cocktail.id);
      return;
    }

    this.liked.update((items) => [cocktail, ...items]);
    this.persist();
  }

  remove(id: Cocktail['id']): void {
    this.liked.update((items) => items.filter((cocktail) => String(cocktail.id) !== String(id)));
    this.persist();
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(this.liked()));
  }

  private readFromStorage(): Cocktail[] {
    if (typeof window === 'undefined') return [];

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => this.toCocktail(item))
        .filter((item): item is Cocktail => item !== null);
    } catch {
      return [];
    }
  }

  private toCocktail(raw: unknown): Cocktail | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const id = record['id'];
    const name = record['name'];
    if ((typeof id !== 'string' && typeof id !== 'number') || typeof name !== 'string') {
      return null;
    }

    const ingredientsRaw = record['ingredients'];
    const tagsRaw = record['tags'];
    const ingredients =
      Array.isArray(ingredientsRaw)
        ? ingredientsRaw.reduce<NonNullable<Cocktail['ingredients']>>((acc, entry) => {
            if (!entry || typeof entry !== 'object') return acc;
            const item = entry as Record<string, unknown>;
            if (typeof item['name'] !== 'string') return acc;

            acc.push({
              ingredientId:
                typeof item['ingredientId'] === 'string' || typeof item['ingredientId'] === 'number'
                  ? item['ingredientId']
                  : undefined,
              name: item['name'],
              measure: typeof item['measure'] === 'string' ? item['measure'] : undefined,
            });
            return acc;
          }, [])
        : undefined;

    return {
      id,
      name,
      created_at: record['created_at'] ? new Date(String(record['created_at'])) : new Date(),
      updated_at: typeof record['updated_at'] === 'string' ? record['updated_at'] : undefined,
      imageUrl: typeof record['imageUrl'] === 'string' ? record['imageUrl'] : undefined,
      image: typeof record['image'] === 'string' ? record['image'] : undefined,
      description: typeof record['description'] === 'string' ? record['description'] : undefined,
      instructions:
        typeof record['instructions'] === 'string' ? record['instructions'] : undefined,
      category: typeof record['category'] === 'string' ? record['category'] : undefined,
      glass: typeof record['glass'] === 'string' ? record['glass'] : undefined,
      alcoholic: typeof record['alcoholic'] === 'boolean' ? record['alcoholic'] : undefined,
      ingredients,
      tags: Array.isArray(tagsRaw)
        ? tagsRaw.filter((tag): tag is string => typeof tag === 'string')
        : undefined,
    };
  }
}
