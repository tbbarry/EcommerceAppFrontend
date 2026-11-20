import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import { mapPricingViewModel, PricingSource, PricingViewModel } from './pricing-view-model';

@Component({
  selector: 'app-product-price-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-price-display.component.html',
  styleUrls: ['./product-price-display.component.css']
})
export class ProductPriceDisplayComponent implements OnChanges {
  @Input({ required: true }) product!: PricingSource;
  @Input() context: 'catalog' | 'detail' = 'catalog';

  viewModel: PricingViewModel = mapPricingViewModel({ price: 0 });

  ngOnChanges(): void {
    this.viewModel = mapPricingViewModel(this.product || { price: 0 });
  }
}
