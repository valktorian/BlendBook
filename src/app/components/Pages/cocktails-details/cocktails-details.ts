import { Component, computed, inject, input } from '@angular/core';
import { Loading } from '../../Design/loading/loading';
import { Cocktail } from '../../../shared/Models/cocktail.model';
import { RoundButton } from '../../Design/buttons/round-button/round-button';
import { Icon } from '../../Design/icon/icon';
import { LikedCocktailsService } from '../../../Services/liked-cocktails.service';

@Component({
  selector: 'app-cocktails-details',
  imports: [Loading, RoundButton, Icon],
  templateUrl: './cocktails-details.html',
  styleUrl: './cocktails-details.scss',
})
export class CocktailsDetails {
  private readonly likedCocktailsService = inject(LikedCocktailsService);

  readonly cocktail = input<Cocktail | null>(null);
  readonly loading = input(false);
  readonly liked = computed(() => this.likedCocktailsService.isLiked(this.cocktail()?.id));

  getImageUrl(cocktail: Cocktail): string | undefined {
    return cocktail.imageUrl || cocktail.image;
  }

  toggleLike(): void {
    const cocktail = this.cocktail();
    if (!cocktail) return;
    this.likedCocktailsService.toggle(cocktail);
  }
}
