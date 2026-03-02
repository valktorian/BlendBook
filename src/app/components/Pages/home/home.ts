import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoundButton } from '../../Design/buttons/round-button/round-button';
import { Icon } from '../../Design/icon/icon';
import { Loading } from '../../Design/loading/loading';
import { CocktailsService } from '../../../Services/cocktails.service';
import { Cocktail } from '../../../shared/Models/cocktail.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RoundButton, Icon, Loading],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly cocktailsService = inject(CocktailsService);
  private readonly router = inject(Router);
  readonly alcoholicCocktailsResource = this.cocktailsService.createCocktailsResource(
    () =>
      ({
        page: 1,
        perPage: 4,
        sortBy: 'created_at',
        sortDir: 'desc',
        alcoholic: true,
      }),
  );
  readonly nonAlcoholicCocktailsResource = this.cocktailsService.createCocktailsResource(
    () =>
      ({
        page: 1,
        perPage: 4,
        sortBy: 'created_at',
        sortDir: 'desc',
        alcoholic: false,
      }),
  );

  readonly cocktails = computed(() => [
    ...(this.alcoholicCocktailsResource.value().data ?? []),
    ...(this.nonAlcoholicCocktailsResource.value().data ?? []),
  ]);
  readonly loading = computed(
    () => this.alcoholicCocktailsResource.isLoading() || this.nonAlcoholicCocktailsResource.isLoading(),
  );
  readonly error = computed(() =>
    this.alcoholicCocktailsResource.error() || this.nonAlcoholicCocktailsResource.error()
      ? 'Impossible de charger les cocktails.'
      : null,
  );

  readonly secondaryImage = computed(
    () => this.getImageUrl(this.cocktails()[2]) || this.getImageUrl(this.cocktails()[3]),
  );
  readonly featuredCocktails = computed(() => {
    return this.cocktails();
  });

  goToCocktails(): void {
    this.router.navigateByUrl('/cocktails');
  }

  goToCocktailDetails(cocktail: Cocktail): void {
    this.router.navigate(['/cocktails'], {
      queryParams: { selected: cocktail.id },
    });
  }

  getImageUrl(cocktail?: Cocktail): string | undefined {
    if (!cocktail) return undefined;
    return cocktail.image || cocktail.imageUrl;
  }

  getAlternativeImageUrl(cocktail?: Cocktail): string | undefined {
    if (!cocktail) return undefined;
    const primary = this.getImageUrl(cocktail);
    if (primary && primary === cocktail.image) return cocktail.imageUrl;
    if (primary && primary === cocktail.imageUrl) return cocktail.image;
    return undefined;
  }

  onCardImageError(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    const alternative = target.getAttribute('data-alt-src');
    if (alternative && target.src !== alternative) {
      target.src = alternative;
      target.removeAttribute('data-alt-src');
      return;
    }

    target.style.visibility = 'hidden';
  }
}
