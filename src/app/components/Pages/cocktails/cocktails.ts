import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CocktailsList } from '../cocktails-list/cocktails-list';
import { CocktailsDetails } from '../cocktails-details/cocktails-details';
import { Cocktail } from '../../../shared/Models/cocktail.model';
import { CocktailsService } from '../../../Services/cocktails.service';

@Component({
  selector: 'app-cocktails',
  imports: [CocktailsList, CocktailsDetails],
  templateUrl: './cocktails.html',
  styleUrl: './cocktails.scss',
})
export class Cocktails {
  private readonly route = inject(ActivatedRoute);
  private readonly cocktailsService = inject(CocktailsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pendingPreselectedId = signal<string | null>(
    this.route.snapshot.queryParamMap.get('selected'),
  );
  private readonly routeCocktailResource = this.cocktailsService.createCocktailByIdResource(
    () => this.pendingPreselectedId(),
  );

  readonly selectedCocktail = signal<Cocktail | null>(null);
  readonly isListLoading = signal(false);
  readonly preselectedId = computed(() => this.pendingPreselectedId());
  readonly detailsLoading = computed(
    () => this.isListLoading() || this.routeCocktailResource.isLoading(),
  );

  constructor() {
    this.bindSelectedFromRoute();
    effect(() => {
      const pendingId = this.pendingPreselectedId();
      if (!pendingId) return;
      const routeCocktail = this.routeCocktailResource.value();
      if (!routeCocktail) return;
      this.selectedCocktail.set(routeCocktail);
    });
    effect(() => {
      if (!this.pendingPreselectedId()) return;
      if (!this.routeCocktailResource.error()) return;
      // If route-preselected fetch fails, release the lock so list selection can proceed.
      this.pendingPreselectedId.set(null);
    });
  }

  private bindSelectedFromRoute(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const selectedId = params.get('selected');
      this.pendingPreselectedId.set(selectedId);
    });
  }

  onCocktailSelected(cocktail: Cocktail | null): void {
    const pendingId = this.pendingPreselectedId();
    if (pendingId && cocktail == null) {
      return;
    }
    if (pendingId && cocktail && String(cocktail.id) !== pendingId) {
      // User picked a different item than the route-preselected one: switch to manual mode.
      this.selectedCocktail.set(cocktail);
      this.pendingPreselectedId.set(null);
      return;
    }
    this.selectedCocktail.set(cocktail);
  }

  onLoadingChange(loading: boolean): void {
    this.isListLoading.set(loading);
  }
}
