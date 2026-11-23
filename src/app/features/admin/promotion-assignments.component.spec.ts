import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PromotionAssignmentsComponent } from './promotion-assignments.component';

describe('Attributions des promotions', () => {
  let fixture: ComponentFixture<PromotionAssignmentsComponent>;
  let component: PromotionAssignmentsComponent;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const promo = {
    id: 1, code: 'ETE', discountValue: 20,
    startDate: '2026-01-01T10:00:00', endDate: '2027-01-01T10:00:00', isActive: true
  };
  const product = {
    id: 4, name: 'Chemise', brand: 'Marque', categoryName: 'Hauts', price: 100,
    totalVariants: 1, totalStock: 5, status: 'ACTIVE', createdAt: '', updatedAt: ''
  };
  const productDetail = {
    ...product, slug: 'chemise', description: 'Chemise', categoryId: 1, images: [],
    variants: [{ id: 9, sku: 'ROUGE-M', price: 100, attributeValues: [], createdAt: '', updatedAt: '' }]
  };
  const assignment = { id: 3, type: 'VARIANT' as const, productId: 4, productName: 'Chemise', variantId: 9, variantSku: 'ROUGE-M' };

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    TestBed.configureTestingModule({
      imports: [PromotionAssignmentsComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PromotionAssignmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/promos/1').flush(promo);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function loadProducts(): void {
    component.openAdd();
    http.expectOne(request => request.url === '/api/admin/products').flush({
      content: [product], number: 0, totalPages: 1, totalElements: 1
    });
    component.selectProduct(product);
    http.expectOne('/api/admin/products/4').flush(productDetail);
  }

  it('shows existing assignments before offering to add products', () => {
    http.expectOne('/api/promos/1/assignments').flush([assignment]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chemise');
    expect(fixture.nativeElement.textContent).toContain('ROUGE-M');
    expect(fixture.nativeElement.textContent).not.toContain('1. Choisissez un produit');
    http.expectNone(request => request.url === '/api/admin/products');
  });

  it('assigns a selected variant and refreshes the list', () => {
    http.expectOne('/api/promos/1/assignments').flush([]);
    loadProducts();
    component.setTarget('VARIANT');
    component.selectedVariantId = 9;
    component.assign();
    const request = http.expectOne('/api/promos/1/assignments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ type: 'VARIANT', targetId: 9 });
    expect(component.canLeave()).toBeFalse();
    request.flush(null);
    http.expectOne('/api/promos/1/assignments').flush([assignment]);
    expect(component.isAssigned('VARIANT', 9)).toBeTrue();
    expect(component.addOpen).toBeFalse();
    expect(component.errorMessage).toBe('');
  });

  it('assigns a whole product and prevents duplicate assignments', () => {
    http.expectOne('/api/promos/1/assignments').flush([]);
    loadProducts();
    component.assign();
    const request = http.expectOne('/api/promos/1/assignments');
    expect(request.request.body).toEqual({ type: 'PRODUCT', targetId: 4 });
    request.flush(null);
    http.expectOne('/api/promos/1/assignments').flush([
      { id: 5, type: 'PRODUCT', productId: 4, productName: 'Chemise', variantId: null, variantSku: null }
    ]);
    component.selectProduct(product);
    http.expectOne('/api/admin/products/4').flush(productDetail);
    component.assign();
    http.expectNone(request => request.method === 'POST');
  });

  it('removes an assignment only after confirmation', () => {
    http.expectOne('/api/promos/1/assignments').flush([assignment]);
    const confirmation = spyOn(window, 'confirm').and.returnValue(false);
    component.removeAssignment(assignment);
    http.expectNone('/api/promos/1/assignments/VARIANT/3');
    confirmation.and.returnValue(true);
    component.removeAssignment(assignment);
    expect(confirmation).toHaveBeenCalledWith(jasmine.stringMatching('Chemise.*ROUGE-M'));
    const request = http.expectOne('/api/promos/1/assignments/VARIANT/3');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    http.expectOne('/api/promos/1/assignments').flush([]);
    expect(component.assignments.length).toBe(0);
  });

  it('shows assignment load errors and prevents changes until a retry succeeds', () => {
    http.expectOne('/api/promos/1/assignments').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Impossible de charger les attributions');
    loadProducts();
    component.assign();
    http.expectNone(request => request.method === 'POST');
    component.loadAssignments();
    http.expectOne('/api/promos/1/assignments').flush([]);
    expect(component.assignmentsError).toBe('');
  });

  it('loads the new promotion when the route changes and handles an invalid ID', () => {
    const pending = http.expectOne('/api/promos/1/assignments');
    params.next(convertToParamMap({ id: '2' }));
    expect(pending.cancelled).toBeTrue();
    http.expectOne('/api/promos/2').flush({ ...promo, id: 2, code: 'HIVER' });
    http.expectOne('/api/promos/2/assignments').flush([]);
    expect(component.promo?.code).toBe('HIVER');
    params.next(convertToParamMap({ id: 'abc' }));
    expect(component.promo).toBeNull();
    expect(component.promoError).toContain('invalide');
  });

  it('displays a missing promotion and allows retrying', () => {
    http.expectOne('/api/promos/1/assignments').flush([]);
    params.next(convertToParamMap({ id: '2' }));
    http.expectOne('/api/promos/2').flush({}, { status: 404, statusText: 'Not Found' });
    expect(component.promoError).toContain('introuvable');
    component.loadPromo();
    http.expectOne('/api/promos/2').flush({ ...promo, id: 2 });
    http.expectOne('/api/promos/2/assignments').flush([]);
    expect(component.promoError).toBe('');
  });

  it('retries the product page that failed to load', () => {
    http.expectOne('/api/promos/1/assignments').flush([]);
    component.openAdd();
    http.expectOne(request => request.url === '/api/admin/products').flush({
      content: [product], number: 0, totalPages: 2, totalElements: 9
    });
    component.loadProducts(1);
    http.expectOne(request => request.url === '/api/admin/products' && request.params.get('page') === '1')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(component.productsError).toContain('Impossible');
    component.loadProducts(component.requestedProductPage);
    http.expectOne(request => request.url === '/api/admin/products' && request.params.get('page') === '1')
      .flush({ content: [], number: 1, totalPages: 2, totalElements: 9 });
    expect(component.productPage).toBe(1);
  });
});
