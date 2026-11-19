import { mapPricingViewModel } from './pricing-view-model';

describe('mapPricingViewModel', () => {
  it('maps NONE promo scope without discount', () => {
    const vm = mapPricingViewModel({
      promoScope: 'NONE',
      hasDiscount: false,
      basePriceMin: 49.9,
      basePriceMax: 49.9,
      price: 49.9
    });

    expect(vm.primaryText).toBe('49,90\u00a0€');
    expect(vm.secondaryText).toBeNull();
    expect(vm.discountBadge).toBeNull();
    expect(vm.hasDiscount).toBeFalse();
  });

  it('maps GLOBAL promo scope with strike and badge', () => {
    const vm = mapPricingViewModel({
      promoScope: 'GLOBAL',
      hasDiscount: true,
      basePriceMin: 100,
      basePriceMax: 100,
      finalPriceMin: 80,
      finalPriceMax: 80,
      discountPercentGlobal: 20
    });

    expect(vm.primaryText).toBe('80,00\u00a0€');
    expect(vm.secondaryText).toBe('100,00\u00a0€');
    expect(vm.discountBadge).toBe('-20%');
    expect(vm.hasDiscount).toBeTrue();
    expect(vm.promoScope).toBe('GLOBAL');
  });

  it('maps VARIANT promo scope with range badge and note', () => {
    const vm = mapPricingViewModel({
      promoScope: 'VARIANT',
      hasDiscount: true,
      basePriceMin: 120,
      basePriceMax: 180,
      finalPriceMin: 96,
      finalPriceMax: 170,
      discountPercentMin: 6,
      discountPercentMax: 20
    });

    expect(vm.primaryText).toBe('À partir de\u00a096,00\u00a0€');
    expect(vm.secondaryText).toBe('au lieu de 120,00\u00a0€');
    expect(vm.discountBadge).toBe('-6% à -20%');
    expect(vm.detailNote).toBe('Remise variable selon la variante');
    expect(vm.detailRangeText).toBe('Prix: 96,00\u00a0€ à 170,00\u00a0€');
    expect(vm.promoScope).toBe('VARIANT');
  });
});
