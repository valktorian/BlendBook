import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Cocktail } from '../shared/Models/cocktail.model';
import { Ingredient } from '../shared/Models/ingredient.model';
import { PagedResponse } from '../shared/Models/paged-response.model';

export type SortDir = 'asc' | 'desc';
export interface GetCocktailsOptions {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDir;
  category?: string;
  glass?: string;
  alcoholic?: boolean;
  ingredient?: string;
}

export interface GetIngredientsOptions {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDir;
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
        return this.buildCocktailByIdResourceRequest(value);
      },
      {
        parse: (raw) => this.mapCocktailEntity(raw),
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

  buildIngredientsResourceRequest(options?: GetIngredientsOptions) {
    return {
      url: `${this.baseUrl}/ingredients`,
      params: this.buildIngredientsResourceParams(options),
    };
  }

  buildIngredientByIdResourceRequest(id: number | string) {
    return {
      url: `${this.baseUrl}/ingredients/${id}`,
    };
  }

  mapIngredientsPage(raw: unknown): PagedResponse<Ingredient> {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const rawData = Array.isArray(source['data']) ? (source['data'] as unknown[]) : [];

    return {
      data: rawData.map((item) => this.mapIngredientEntity(item)),
      meta: source['meta'] as PagedResponse<Ingredient>['meta'],
      pagination: source['pagination'] as PagedResponse<Ingredient>['pagination'],
    };
  }

  mapIngredientEntity(raw: unknown): Ingredient {
    const item = raw as Record<string, unknown>;

    return {
      id: (item['id'] as number | string) ?? '',
      name: String(item['name'] ?? ''),
      imageUrl: this.normalizeImageUrl(item['imageUrl']),
      description: item['description'] ? String(item['description']) : undefined,
      type: item['type'] ? String(item['type']) : undefined,
      abv: typeof item['abv'] === 'number' ? (item['abv'] as number) : undefined,
    };
  }

  private buildCocktailsResourceParams(options?: GetCocktailsOptions) {
    const params: Record<string, string | number | boolean> = {};

    if (options?.page != null) params['page'] = options.page;
    if (options?.perPage != null) params['limit'] = options.perPage;
    if (options?.search) params['search'] = options.search;

    if (options?.sortBy && options?.sortDir) {
      params['sort'] = `${options.sortBy}_${options.sortDir}`;
    }

    if (options?.category) params['category'] = options.category;
    if (options?.glass) params['glass'] = options.glass;
    if (options?.alcoholic != null) params['alcoholic'] = options.alcoholic;
    if (options?.ingredient) params['ingredient'] = options.ingredient;

    return params;
  }

  private buildIngredientsResourceParams(options?: GetIngredientsOptions) {
    const params: Record<string, string | number | boolean> = {};

    if (options?.page != null) params['page'] = options.page;
    if (options?.perPage != null) params['limit'] = options.perPage;
    if (options?.search) params['search'] = options.search;

    if (options?.sortBy && options?.sortDir) {
      params['sort'] = `${options.sortBy}_${options.sortDir}`;
    }

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
