import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProductDetailComponent } from './product-detail.component';

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;

  beforeEach(() => {
    component = new ProductDetailComponent(
      { paramMap: of({ get: () => null }) } as ActivatedRoute,
      {} as HttpClient
    );
  });

  it('blocks add-to-cart until required options are chosen', () => {
    component.product = {
      stockSummary: { inStock: true, totalStock: 12 },
      colors: [{ name: 'Black', available: true, totalStock: 12, imageCount: 1, sizesAvailable: ['M', 'L'] }],
      sizes: [{ value: 'M', available: true, totalStock: 12 }],
      selectionMatrix: {
        Black: {
          M: { variantId: 101, stock: 12, inStock: true },
          L: { variantId: 102, stock: 4, inStock: true }
        }
      }
    } as any;

    expect(component.canAddToCart()).toBeFalse();

    component.selectColor('Black');
    expect(component.canAddToCart()).toBeFalse();

    component.selectSize('M');
    expect(component.canAddToCart()).toBeTrue();
  });
});
