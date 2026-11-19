import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stock-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-indicator.component.html',
  styleUrls: ['./stock-indicator.component.css']
})
export class StockIndicatorComponent {
  @Input() selectionComplete = false;
  @Input() stock = 0;
  @Input() hasAnyStock = false;

  get label(): string {
    if (!this.selectionComplete) {
      return 'Sélectionnez une couleur et une taille';
    }

    if (this.stock <= 0) {
      return 'Rupture de stock';
    }

    if (this.stock <= 3) {
      return 'Stock faible';
    }

    return 'En stock';
  }

  get tone(): 'muted' | 'danger' | 'warning' | 'success' {
    if (!this.selectionComplete) {
      return 'muted';
    }

    if (this.stock <= 0) {
      return 'danger';
    }

    if (this.stock <= 3) {
      return 'warning';
    }

    return 'success';
  }
}
