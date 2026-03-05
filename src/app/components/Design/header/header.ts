import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../icon/icon';
import { RoundButton } from '../buttons/round-button/round-button';
import { Cart } from '../cart/cart';
import { LikedCocktailsService } from '../../../Services/liked-cocktails.service';
import { Cocktail } from '../../../shared/Models/cocktail.model';

@Component({
  selector: 'app-header',
  imports: [Icon, RoundButton, Cart],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly router = inject(Router);
  private readonly likedCocktailsService = inject(LikedCocktailsService);

  readonly theme = input<'base' | 'moon' | 'night-meteor'>('base');
  readonly themeChange = output<'base' | 'moon' | 'night-meteor'>();
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

  toggleTheme(): void {
    this.themeChange.emit(this.nextTheme());
  }

  nextTheme(): 'base' | 'moon' | 'night-meteor' {
    const current = this.theme();
    if (current === 'base') return 'moon';
    if (current === 'moon') return 'night-meteor';
    return 'base';
  }

  nextThemeIcon(): string {
    const current = this.theme();
    if (current === 'moon') return 'theme-moon';
    if (current === 'night-meteor') return 'theme-stars';
    return 'theme-sun';
  }

  nextThemeLabel(): string {
    const next = this.nextTheme();
    if (next === 'moon') return 'Switch to Moon theme';
    if (next === 'night-meteor') return 'Switch to NightMeteor theme';
    return 'Switch to Base theme';
  }
}
