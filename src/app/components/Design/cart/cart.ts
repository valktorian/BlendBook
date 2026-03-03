import { Component, input, output } from '@angular/core';
import { Cocktail } from '../../../shared/Models/cocktail.model';
import { Icon } from '../icon/icon';
import { RoundButton } from '../buttons/round-button/round-button';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [Icon, RoundButton],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  readonly cocktails = input<Cocktail[]>([]);
  readonly cocktailSelected = output<Cocktail>();
  readonly unlikeCocktail = output<Cocktail['id']>();

  onSelect(cocktail: Cocktail): void {
    this.cocktailSelected.emit(cocktail);
  }

  onUnlike(cocktail: Cocktail): void {
    this.unlikeCocktail.emit(cocktail.id);
  }
}
