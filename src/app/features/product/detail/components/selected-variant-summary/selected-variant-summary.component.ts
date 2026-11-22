import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ProductVariantViewModel } from '../../product-detail-view-model';

@Component({
  selector: 'app-selected-variant-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-variant-summary.component.html',
  styleUrls: ['./selected-variant-summary.component.css']
})
export class SelectedVariantSummaryComponent {
  @Input() variant: ProductVariantViewModel | null = null;
  @Input() color: string | null = null;
  @Input() size: string | null = null;
  @Input() stock = 0;
}
