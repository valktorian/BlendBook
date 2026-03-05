import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './components/Design/footer/footer';
import { Header } from './components/Design/header/header';
import { Toaster } from './components/Design/toaster/toaster';
import { CocktailsService } from './Services/cocktails.service';
import { IngredientsService } from './Services/ingredients.service';
import { LikedCocktailsService } from './Services/liked-cocktails.service';

type AppTheme = 'base' | 'moon' | 'night-meteor';

@Component({
  selector: 'app-root',
  imports: [Footer, Header, RouterOutlet, Toaster],
  providers: [CocktailsService, IngredientsService, LikedCocktailsService],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly themeStorageKey = 'app.theme.v1';
  readonly theme = signal<AppTheme>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  onThemeChange(theme: AppTheme): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private readInitialTheme(): AppTheme {
    if (typeof window === 'undefined') return 'base';
    const raw = window.localStorage.getItem(this.themeStorageKey);
    return raw === 'night-meteor' || raw === 'moon' || raw === 'base' ? raw : 'base';
  }

  private persistTheme(theme: AppTheme): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.themeStorageKey, theme);
  }
}
