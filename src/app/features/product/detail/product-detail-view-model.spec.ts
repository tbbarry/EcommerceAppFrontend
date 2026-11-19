import { buildProductDetailViewModel } from './product-detail-view-model';

describe('buildProductDetailViewModel', () => {
  it('maps required pricing and stock defaults', () => {
    const vm = buildProductDetailViewModel({
      id: 1,
      slug: 'shoe-alpha',
      name: 'Shoe Alpha',
      price: 120,
      pricing: {
        hasDiscount: true,
        promoScope: 'GLOBAL',
        basePriceMin: 120,
        basePriceMax: 120,
        finalPriceMin: 96,
        finalPriceMax: 96,
        discountPercentGlobal: 20
      },
      stockSummary: {
        totalStock: 8,
        inStockVariants: 2,
        outOfStockVariants: 1,
        hasAnyStock: true
      },
      categories: [{ id: 10, name: 'Sneakers', parentName: 'Men' }],
      colors: [{ name: 'Black', available: true, totalStock: 8, imageCount: 2, sizesAvailable: ['42'] }],
      sizes: [{ value: '42', available: true, totalStock: 8 }],
      defaultImages: [{ id: 100, url: '/p-1.jpg', isMain: true }],
      imagesByColor: {
        Black: [{ id: 101, url: '/p-1-black.jpg', isMain: true, color: 'Black' }]
      },
      variants: [{ id: 900, sku: 'SKU-900', color: 'Black', size: '42', price: 120, finalPrice: 96, stock: 8, inStock: true, imageIds: [101] }],
      selectionMatrix: {
        Black: {
          '42': { variantId: 900, stock: 8, inStock: true }
        }
      }
    });

    expect(vm.name).toBe('Shoe Alpha');
    expect(vm.pricing.promoScope).toBe('GLOBAL');
    expect(vm.stockSummary.hasAnyStock).toBeTrue();
    expect(vm.breadcrumbs).toEqual(['Men', 'Sneakers']);
    expect(vm.defaultImages.length).toBe(1);
    expect(vm.selectionMatrix.Black['42'].variantId).toBe(900);
  });
});
