import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Cocktail } from '../shared/Models/cocktail.model';
import { Category } from '../shared/Models/Category.model';
import { Glass } from '../shared/Models/glass.model';
import { PagedResponse } from '../shared/Models/paged-response.model';

export type SortDir = 'asc' | 'desc';
export interface GetCocktailsOptions {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDir;
  categoryId?: number;
  glassTypeId?: number;
  category?: string;
  glass?: string;
  alcoholic?: boolean;
  ingredient?: string;
}

@Injectable()
export class CocktailsService {
  private readonly baseUrl = 'https://boozeapi.com/api/v1';
  private readonly apiOrigin = 'https://boozeapi.com';

  createCocktailsResource(
    options: () => GetCocktailsOptions,
    defaultValue: PagedResponse<Cocktail> = { data: [] },
  ): HttpResourceRef<PagedResponse<Cocktail>> {
    return httpResource(
      () => this.buildCocktailsResourceRequest(options()),
      {
        parse: (raw) => this.mapCocktailsPage(raw),
        defaultValue,
      },
    );
  }

  createCocktailByIdResource(
    id: () => number | string | null | undefined,
  ): HttpResourceRef<Cocktail | undefined> {
    return httpResource(
      () => {
        const value = id();
        if (value == null || value === '') return undefined;
        if (typeof value === 'string' && value.startsWith('local-')) return undefined;
        return this.buildCocktailByIdResourceRequest(value);
      },
      {
        parse: (raw) => this.mapCocktailEntity(raw),
      },
    );
  }

  createCocktailsAutocompleteResource(
    query: () => string | null | undefined,
    defaultValue: PagedResponse<Cocktail> = { data: [] },
  ): HttpResourceRef<PagedResponse<Cocktail>> {
    return httpResource(
      () => {
        const q = query()?.trim();
        if (!q) return undefined;
        return {
          url: `${this.baseUrl}/cocktails/autocomplete`,
          params: { q },
        };
      },
      {
        parse: (raw) => this.mapCocktailsPage(raw),
        defaultValue,
      },
    );
  }

  createCategoriesResource(defaultValue: Category[] = []): HttpResourceRef<Category[]> {
    return httpResource(
      () => ({
        url: `${this.baseUrl}/categories`,
      }),
      {
        parse: (raw) => this.mapCategories(raw),
        defaultValue,
      },
    );
  }

  createGlassesResource(defaultValue: Glass[] = []): HttpResourceRef<Glass[]> {
    return httpResource(
      () => ({
        url: `${this.baseUrl}/glasses`,
      }),
      {
        parse: (raw) => this.mapGlasses(raw),
        defaultValue,
      },
    );
  }

  buildCocktailsResourceRequest(options?: GetCocktailsOptions) {
    return {
      url: `${this.baseUrl}/cocktails`,
      params: this.buildCocktailsResourceParams(options),
    };
  }

  buildCocktailByIdResourceRequest(id: number | string) {
    return {
      url: `${this.baseUrl}/cocktails/${id}`,
    };
  }

  mapCocktailsPage(raw: unknown): PagedResponse<Cocktail> {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const rawData = Array.isArray(source['data']) ? (source['data'] as unknown[]) : [];

    return {
      data: rawData.map((item) => this.mapCocktailEntity(item)),
      meta: source['meta'] as PagedResponse<Cocktail>['meta'],
      pagination: source['pagination'] as PagedResponse<Cocktail>['pagination'],
    };
  }

  mapCocktailEntity(raw: unknown): Cocktail {
    const item = raw as Record<string, unknown>;
    const category = item['category'] as unknown;
    const glassType = item['glass_type'] as unknown;
    const ingredients = item['ingredients'] as unknown;

    return {
      id: (item['id'] as number | string) ?? '',
      name: String(item['name'] ?? ''),
      created_at: item['created_at'] ? new Date(String(item['created_at'])) : new Date(NaN),
      updated_at: item['updated_at'] ? String(item['updated_at']) : undefined,
      alcoholic:
        typeof item['alcoholic'] === 'boolean' ? (item['alcoholic'] as boolean) : undefined,
      image: this.normalizeImageUrl(item['image']),
      imageUrl: this.normalizeImageUrl(item['imageUrl']),
      instructions: item['instructions'] ? String(item['instructions']) : undefined,
      description: item['description'] ? String(item['description']) : undefined,
      tags: Array.isArray(item['tags']) ? (item['tags'] as string[]) : undefined,
      category: this.getLabel(category),
      glass:
        this.getLabel(glassType) ||
        (typeof item['glass'] === 'string' ? (item['glass'] as string) : undefined),
      ingredients: this.mapIngredients(ingredients),
    };
  }

  mapCategories(raw: unknown): Category[] {
    return this.mapLabeledEntities<Category>(raw);
  }

  mapGlasses(raw: unknown): Glass[] {
    return this.mapLabeledEntities<Glass>(raw);
  }

  private mapLabeledEntities<T extends { id: number; label: string; created_at: string; updated_at: string }>(
    raw: unknown,
  ): T[] {
    if (!Array.isArray(raw)) return [];

    return raw.reduce<T[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc;
      const record = item as Record<string, unknown>;
      const id = record['id'];
      const label = record['label'];
      if (typeof id !== 'number' || typeof label !== 'string') return acc;

      acc.push({
        id,
        label,
        created_at: typeof record['created_at'] === 'string' ? record['created_at'] : '',
        updated_at: typeof record['updated_at'] === 'string' ? record['updated_at'] : '',
      } as T);
      return acc;
    }, []);
  }

  private buildCocktailsResourceParams(options?: GetCocktailsOptions) {
    const params: Record<string, string | number | boolean> = {};

    if (options?.page != null) params['page'] = options.page;
    if (options?.perPage != null) params['limit'] = options.perPage;
    if (options?.search) params['search'] = options.search;

    if (options?.sortBy && options?.sortDir) {
      params['sort'] = `${options.sortBy}_${options.sortDir}`;
    }

    if (options?.categoryId != null) params['category_id'] = options.categoryId;
    if (options?.glassTypeId != null) params['glass_type'] = options.glassTypeId;
    if (options?.category) params['category'] = options.category;
    if (options?.glass) params['glass'] = options.glass;
    if (options?.alcoholic != null) params['alcoholic'] = options.alcoholic;
    if (options?.ingredient) params['ingredient'] = options.ingredient;

    return params;
  }

  private normalizeImageUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return value.startsWith('/') ? `${this.apiOrigin}${value}` : `${this.apiOrigin}/${value}`;
  }

  private getLabel(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const label = (value as Record<string, unknown>)['label'];
      if (typeof label === 'string') return label;
    }
    return undefined;
  }

  private mapIngredients(value: unknown): Cocktail['ingredients'] {
    if (!Array.isArray(value)) return undefined;
    return value.map((ing) => {
      if (typeof ing === 'string') {
        return { name: ing };
      }
      const record = ing as Record<string, unknown>;
      return {
        ingredientId: (record['ingredientId'] ?? record['id']) as number | string | undefined,
        name: String(record['name'] ?? ''),
        measure: record['measure'] ? String(record['measure']) : undefined,
      };
    });
  }
}
