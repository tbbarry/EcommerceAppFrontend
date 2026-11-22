export type PromoScope = 'NONE' | 'GLOBAL' | 'VARIANT';

export interface PricingSource {
  price?: number | null;
  basePriceMin?: number | null;
  basePriceMax?: number | null;
  finalPriceMin?: number | null;
  finalPriceMax?: number | null;
  displayPrice?: string | null;
  hasDiscount?: boolean | null;
  promoScope?: PromoScope | string | null;
  discountPercentGlobal?: number | null;
  discountPercentMin?: number | null;
  discountPercentMax?: number | null;
}

export interface PricingViewModel {
  primaryText: string;
  secondaryText: string | null;
  discountBadge: string | null;
  hasDiscount: boolean;
  promoScope: PromoScope;
  detailNote: string | null;
  detailRangeText: string | null;
}

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function safeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function formatUsd(value: number): string {
  return USD_FORMATTER.format(value);
}

function clampPercent(value: number | null): number | null {
  if (value == null) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function normalizedScope(scope: string | null | undefined): PromoScope {
  if (scope === 'GLOBAL' || scope === 'VARIANT') {
    return scope;
  }

  return 'NONE';
}

function computeBasePrices(product: PricingSource): { min: number; max: number } {
  const fallback = safeNumber(product.price) ?? 0;
  const min = safeNumber(product.basePriceMin) ?? fallback;
  const max = safeNumber(product.basePriceMax) ?? min;

  return {
    min,
    max: Math.max(min, max)
  };
}

function computeFinalPrices(product: PricingSource, baseMin: number): { min: number; max: number } {
  const min = safeNumber(product.finalPriceMin) ?? baseMin;
  const max = safeNumber(product.finalPriceMax) ?? min;

  return {
    min,
    max: Math.max(min, max)
  };
}

function samePrice(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

function makeVariantDiscountLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) {
    return null;
  }

  const resolvedMin = min ?? max;
  const resolvedMax = max ?? min;

  if (resolvedMin == null || resolvedMax == null) {
    return null;
  }

  if (resolvedMin === resolvedMax) {
    return `-${resolvedMax}%`;
  }

  return `${resolvedMin}%–${resolvedMax}% off`;
}

export function mapPricingViewModel(product: PricingSource): PricingViewModel {
  const hasNumericPrice = [
    safeNumber(product.price),
    safeNumber(product.basePriceMin),
    safeNumber(product.basePriceMax),
    safeNumber(product.finalPriceMin),
    safeNumber(product.finalPriceMax)
  ].some((value) => value != null);

  const displayPriceFallback = typeof product.displayPrice === 'string'
    ? product.displayPrice.trim()
    : '';

  if (!hasNumericPrice && displayPriceFallback) {
    return {
      primaryText: displayPriceFallback,
      secondaryText: null,
      discountBadge: null,
      hasDiscount: false,
      promoScope: 'NONE',
      detailNote: null,
      detailRangeText: null
    };
  }

  const base = computeBasePrices(product);
  const final = computeFinalPrices(product, base.min);

  const scope = normalizedScope(product.promoScope);
  const hasDiscount = product.hasDiscount === true;

  const globalDiscount = clampPercent(safeNumber(product.discountPercentGlobal));
  const discountMin = clampPercent(safeNumber(product.discountPercentMin));
  const discountMax = clampPercent(safeNumber(product.discountPercentMax));

  const baseMinText = formatUsd(base.min);
  const baseMaxText = formatUsd(base.max);
  const finalMinText = formatUsd(final.min);
  const finalMaxText = formatUsd(final.max);

  const rangePrefix = 'From\u00a0';

  if (!hasDiscount || scope === 'NONE') {
    return {
      primaryText: samePrice(base.min, base.max) ? baseMinText : `${rangePrefix}${baseMinText}`,
      secondaryText: null,
      discountBadge: null,
      hasDiscount: false,
      promoScope: 'NONE',
      detailNote: null,
      detailRangeText: samePrice(base.min, base.max) ? null : `Price: ${baseMinText}–${baseMaxText}`
    };
  }

  if (scope === 'GLOBAL') {
    const badge = globalDiscount != null ? `-${globalDiscount}%` : null;

    if (samePrice(final.min, final.max)) {
      return {
        primaryText: finalMinText,
        secondaryText: baseMinText,
        discountBadge: badge,
        hasDiscount: true,
        promoScope: 'GLOBAL',
        detailNote: null,
        detailRangeText: null
      };
    }

    return {
      primaryText: `${rangePrefix}${finalMinText}`,
      secondaryText: `was ${baseMinText}`,
      discountBadge: badge,
      hasDiscount: true,
      promoScope: 'GLOBAL',
      detailNote: null,
      detailRangeText: `Price: ${finalMinText}–${finalMaxText}`
    };
  }

  return {
    primaryText: `${rangePrefix}${finalMinText}`,
    secondaryText: `was ${baseMinText}`,
    discountBadge: makeVariantDiscountLabel(discountMin, discountMax),
    hasDiscount: true,
    promoScope: 'VARIANT',
    detailNote: 'Discount varies by option',
    detailRangeText: samePrice(final.min, final.max) ? null : `Price: ${finalMinText}–${finalMaxText}`
  };
}
