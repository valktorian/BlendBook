import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../icon/icon';
import { RoundButton } from '../buttons/round-button/round-button';
import { SquareButton } from '../buttons/square-button/square-button';
import { Cart } from '../cart/cart';
import { LikedCocktailsService } from '../../../Services/liked-cocktails.service';
import { Cocktail } from '../../../shared/Models/cocktail.model';

@Component({
  selector: 'app-header',
  imports: [Icon, RoundButton, SquareButton, Cart],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly router = inject(Router);
  private readonly likedCocktailsService = inject(LikedCocktailsService);

  readonly showCartDialog = signal(false);
  readonly likedCocktails = computed(() => this.likedCocktailsService.likedCocktails());
  readonly likedCount = computed(() => this.likedCocktailsService.likedCount());

  go(path: string): void {
    this.router.navigateByUrl(path);
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  toggleCartDialog(): void {
    this.showCartDialog.update((value) => !value);
  }

  closeCartDialog(): void {
    this.showCartDialog.set(false);
  }

  onCartCocktailSelected(cocktail: Cocktail): void {
    this.router.navigate(['/cocktails'], { queryParams: { selected: cocktail.id } });
    this.closeCartDialog();
  }

  onUnlikeCocktail(id: Cocktail['id']): void {
    this.likedCocktailsService.remove(id);
  }
}
