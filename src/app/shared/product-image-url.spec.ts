import { resolveProductImageUrl } from './product-image-url';
import { buildProductDetailViewModel } from '../features/product/detail/product-detail-view-model';

describe('resolveProductImageUrl', () => {
  it('resolves backend paths and preserves external, already resolved and local image URLs', () => {
    expect(resolveProductImageUrl('product_1/image.jpg')).toBe('/api/images/products/product_1/image.jpg');
    expect(resolveProductImageUrl('product_1001\\image.png')).toBe('/api/images/products/product_1001/image.png');
    expect(resolveProductImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(resolveProductImageUrl('/api/images/products/product_1/image.jpg')).toBe('/api/images/products/product_1/image.jpg');
    expect(resolveProductImageUrl('assets/img/product.jpg')).toBe('assets/img/product.jpg');
    expect(resolveProductImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('resolves uploaded images in the storefront product detail', () => {
    const product = buildProductDetailViewModel({
      id: 1, slug: 'produit', name: 'Produit',
      defaultImages: [{ id: 1, url: 'product_1\\photo.jpg' }],
      imagesByColor: { Rouge: [{ id: 2, url: 'https://example.com/image.jpg' }] }
    });
    expect(product.defaultImages[0].url).toBe('/api/images/products/product_1/photo.jpg');
    expect(product.imagesByColor['rouge'][0].url).toBe('https://example.com/image.jpg');
  });
});
