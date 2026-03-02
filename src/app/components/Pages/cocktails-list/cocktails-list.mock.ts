import { Cocktail } from '../../../shared/Models/cocktail.model';
import { NewCocktailFormValue } from '../../Design/add-cocktail-form/add-cocktail-form';

export const COCKTAILS_MOCK_STORAGE_KEY = 'cocktails.mock.items.v1';

interface PersistedMockState {
  locals: Cocktail[];
  edits: Cocktail[];
}

export interface MockState {
  locals: Cocktail[];
  edits: Record<string, Cocktail>;
}

export function loadMockState(): MockState {
  if (typeof window === 'undefined') return { locals: [], edits: {} };

  const raw = window.localStorage.getItem(COCKTAILS_MOCK_STORAGE_KEY);
  if (!raw) return { locals: [], edits: {} };

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const locals = parsed
        .map((item) => toMockCocktail(item))
        .filter((item): item is Cocktail => item !== null);
      return { locals, edits: {} };
    }

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const localsRaw = Array.isArray(record['locals']) ? record['locals'] : [];
      const editsRaw = Array.isArray(record['edits']) ? record['edits'] : [];

      const locals = localsRaw
        .map((item) => toMockCocktail(item))
        .filter((item): item is Cocktail => item !== null);
      const editsArray = editsRaw
        .map((item) => toMockCocktail(item))
        .filter((item): item is Cocktail => item !== null);

      const edits = editsArray.reduce<Record<string, Cocktail>>((acc, item) => {
        acc[String(item.id)] = item;
        return acc;
      }, {});

      return { locals, edits };
    }
  } catch {
    return { locals: [], edits: {} };
  }

  return { locals: [], edits: {} };
}

export function persistMockState(locals: Cocktail[], edits: Record<string, Cocktail>): void {
  if (typeof window === 'undefined') return;
  const payload: PersistedMockState = {
    locals,
    edits: Object.values(edits),
  };
  window.localStorage.setItem(COCKTAILS_MOCK_STORAGE_KEY, JSON.stringify(payload));
}

export function toFormValue(cocktail: Cocktail | null): NewCocktailFormValue {
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

function toMockCocktail(raw: unknown): Cocktail | null {
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
