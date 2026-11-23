import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CartService } from '../../core/cart.service';
import { ApiProductDetail, ApiVariant } from './detail/product-detail-view-model';
import { ProductDetailComponent } from './product-detail.component';

describe('Stock sur la fiche produit', () => {
  let response: ApiProductDetail;

  beforeEach(() => {
    response = { id: 1, slug: 'produit', name: 'Produit', variants: [] };
    TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'produit' })) } },
        { provide: HttpClient, useValue: { get: () => of(response) } },
        { provide: CartService, useValue: {} }
      ]
    });
  });

  function variant(id: number, color: string | null, size: string | null, stock: number): ApiVariant {
    return { id, color, size, price: 50, stock, inStock: stock > 0 };
  }

  function render(): ProductDetailComponent {
    const fixture = TestBed.createComponent(ProductDetailComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('reconnaît une variante en stock avec une couleur mais sans taille', () => {
    response.colors = [{ name: 'Rouge', available: true, totalStock: 23 }];
    response.variants = [variant(1, 'Rouge', null, 23)];

    const component = render();
    expect(component.selectedVariant?.id).toBe(1);
    expect(component.stockLabel).toBe('In stock');
    expect(component.selectedVariantStock).toBe(23);
    expect(component.canAddToCart()).toBeTrue();
  });

  it('sélectionne les variantes avec une taille seule ou sans attribut', () => {
    response.sizes = [{ value: 'M', available: true }, { value: 'L', available: true }];
    response.variants = [variant(1, null, 'M', 5), variant(2, null, 'L', 2)];
    const component = render();

    expect(component.selectedVariant?.id).toBe(1);
    component.onSizeChoose('L');
    expect(component.selectedVariant?.id).toBe(2);
    expect(component.stockLabel).toBe('Low stock');
    expect(component.canAddToCart()).toBeTrue();

    response.sizes = [];
    response.variants = [variant(3, null, null, 0)];
    const outOfStock = render();
    expect(outOfStock.selectedVariant?.id).toBe(3);
    expect(outOfStock.stockLabel).toBe('Out of stock');
    expect(outOfStock.canAddToCart()).toBeFalse();
  });

  it('ne choisit pas arbitrairement une variante lorsque la sélection est ambiguë', () => {
    response.colors = [{ name: 'Rouge', available: true }];
    response.variants = [variant(1, 'Rouge', null, 5), variant(2, 'Rouge', null, 5)];
    const component = render();

    expect(component.selectedVariant).toBeNull();
    expect(component.stockLabel).toBe('Variante indisponible');
    expect(component.canAddToCart()).toBeFalse();
  });

  it('conserve la sélection par couleur et taille', () => {
    response.colors = [{ name: 'Rouge', available: true }, { name: 'Bleu', available: true }];
    response.sizes = [{ value: 'M', available: true }];
    response.variants = [variant(1, 'Rouge', 'M', 5), variant(2, 'Bleu', 'M', 0)];
    response.selectionMatrix = {
      Rouge: { M: { variantId: 1, stock: 5, inStock: true } },
      Bleu: { M: { variantId: 2, stock: 0, inStock: false } }
    };
    const component = render();

    expect(component.stockLabel).toBe('Select a color');
    component.onColorChoose('Rouge');
    expect(component.selectedVariant?.id).toBe(1);
    expect(component.canAddToCart()).toBeTrue();
  });
});
