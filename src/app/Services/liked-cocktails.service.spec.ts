import { TestBed } from '@angular/core/testing';
import { LikedCocktailsService } from './liked-cocktails.service';

describe('LikedCocktailsService', () => {
  let service: LikedCocktailsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [LikedCocktailsService],
    });
    service = TestBed.inject(LikedCocktailsService);
  });

  it('toggle add: should like a cocktail on first toggle', () => {
    const cocktail = { id: 1, name: 'Mojito', created_at: new Date() };

    service.toggle(cocktail);

    expect(service.isLiked(1)).toBeTrue();
    expect(service.likedCount()).toBe(1);
  });

  it('toggle remove: should unlike cocktail on second toggle', () => {
    const cocktail = { id: 1, name: 'Mojito', created_at: new Date() };
    service.toggle(cocktail);

    service.toggle(cocktail);

    expect(service.isLiked(1)).toBeFalse();
    expect(service.likedCount()).toBe(0);
  });

  it('isLiked(null): should return false', () => {
    expect(service.isLiked(null)).toBeFalse();
  });
});
