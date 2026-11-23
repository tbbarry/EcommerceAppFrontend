import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ProductPricingViewModel, ProductVariantViewModel } from '../../product-detail-view-model';
import { PromotionBadgeComponent } from '../promotion-badge/promotion-badge.component';
import { formatUsd } from '../../../../../shared/pricing/pricing-view-model';

@Component({
  selector: 'app-product-price-block',
  standalone: true,
  imports: [CommonModule, PromotionBadgeComponent],
  templateUrl: './product-price-block.component.html',
  styleUrls: ['./product-price-block.component.css']
})
export class ProductPriceBlockComponent {
  @Input({ required: true }) pricing!: ProductPricingViewModel;
  @Input() selectedVariant: ProductVariantViewModel | null = null;

  format(value: number): string {
    return formatUsd(value);
  }

  get primaryPrice(): string {
    if (this.selectedVariant) {
      return this.format(this.selectedVariant.finalPrice);
    }

    if (!this.pricing.hasDiscount) {
      if (this.pricing.finalPriceMin === this.pricing.finalPriceMax) {
        return this.format(this.pricing.finalPriceMin);
      }

      return `À partir de ${this.format(this.pricing.finalPriceMin)}`;
    }

    if (this.pricing.promoScope === 'GLOBAL') {
      if (this.pricing.finalPriceMin === this.pricing.finalPriceMax) {
        return this.format(this.pricing.finalPriceMin);
      }

      return `À partir de ${this.format(this.pricing.finalPriceMin)}`;
    }

    return `À partir de ${this.format(this.pricing.finalPriceMin)}`;
  }

  get strikePrice(): string | null {
    if (this.selectedVariant) {
      if (this.selectedVariant.appliedDiscountPercent <= 0) {
        return null;
      }

      return this.format(this.selectedVariant.price);
    }

    if (!this.pricing.hasDiscount) {
      return null;
    }

    if (this.pricing.promoScope === 'GLOBAL') {
      return this.format(this.pricing.basePriceMin);
    }

    if (this.pricing.promoScope === 'VARIANT') {
      return this.format(this.pricing.basePriceMin);
    }

    return null;
  }

  get badgeLabel(): string | null {
    if (this.selectedVariant && this.selectedVariant.appliedDiscountPercent > 0) {
      return `-${Math.round(this.selectedVariant.appliedDiscountPercent)}%`;
    }

    if (!this.pricing.hasDiscount) {
      return null;
    }

    if (this.pricing.promoScope === 'GLOBAL' && this.pricing.discountPercentGlobal != null) {
      return `-${this.pricing.discountPercentGlobal}%`;
    }

    if (this.pricing.promoScope === 'VARIANT') {
      if (this.pricing.discountPercentMax == null) {
        return null;
      }

      return `Jusqu'à -${this.pricing.discountPercentMax}%`;
    }

    return null;
  }

  get variableDiscountNote(): string | null {
    if (this.selectedVariant) {
      return null;
    }

    if (
      this.pricing.hasDiscount
      && this.pricing.promoScope === 'VARIANT'
      && this.pricing.discountPercentMin != null
      && this.pricing.discountPercentMax != null
      && this.pricing.discountPercentMin !== this.pricing.discountPercentMax
    ) {
      return 'Réduction variable selon la variante';
    }

    return null;
  }
}
