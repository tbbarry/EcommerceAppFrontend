import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AdminProductService } from '../../core/admin-product.service';
import { ProductAdminDetailResponse } from '../../models/admin-product.model';
import { AdminProductDetailComponent } from './product-detail.component';

describe('AdminProductDetailComponent', () => {
  it('loads the route product on initialization and unsubscribes on destruction', () => {
    const params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const product: ProductAdminDetailResponse = {
      id: 1,
      name: 'Produit',
      description: '',
      brand: '',
      slug: 'produit',
      price: 10,
      categoryId: 1,
      categoryName: 'Catégorie',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      variants: [],
      images: []
    };
    const service = jasmine.createSpyObj<AdminProductService>('AdminProductService', ['getProductDetail']);
    service.getProductDetail.and.returnValue(of(product));

    TestBed.configureTestingModule({
      imports: [AdminProductDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: AdminProductService, useValue: service }
      ]
    });

    const fixture = TestBed.createComponent(AdminProductDetailComponent);
    fixture.detectChanges();

    expect(service.getProductDetail).toHaveBeenCalledOnceWith(1);
    expect(fixture.componentInstance.product).toEqual(product);

    fixture.destroy();
    params.next(convertToParamMap({ id: '2' }));
    expect(service.getProductDetail).toHaveBeenCalledTimes(1);
  });
});
