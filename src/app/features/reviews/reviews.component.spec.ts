import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductReviewsComponent } from './product-reviews.component';
import { ReviewEditorComponent } from './review-editor.component';
import { ReviewManagementComponent } from '../admin/review-management.component';

describe('Avis clients', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductReviewsComponent, ReviewEditorComponent, ReviewManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('affiche les notes réelles et permet de parcourir les avis', () => {
    const fixture = TestBed.createComponent(ProductReviewsComponent);
    fixture.componentRef.setInput('productId', 4);
    fixture.detectChanges();
    const page = {
      count: 12, average: 4.5, distribution: { 1: 0, 2: 0, 3: 0, 4: 6, 5: 6 },
      reviews: { content: [{ id: 1, productName: 'Veste', rating: 5, comment: 'Très belle', createdAt: '2026-01-01', visible: true }], totalPages: 2 }
    };
    http.expectOne(req => req.url.endsWith('/products/4/reviews') && req.params.get('page') === '0').flush(page);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4.5');
    expect(fixture.nativeElement.textContent).toContain('Très belle');
    expect(fixture.nativeElement.textContent).toContain('Verified purchase');
    fixture.nativeElement.querySelector('.pagination button:last-child').click();
    http.expectOne(req => req.url.endsWith('/products/4/reviews') && req.params.get('page') === '1')
      .flush({ ...page, reviews: { content: [], totalPages: 2 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Page 2 / 2');
  });

  it('enregistre et supprime un avis sur un article livré', () => {
    const fixture = TestBed.createComponent(ReviewEditorComponent);
    fixture.componentRef.setInput('itemId', 7);
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    http.expectOne(req => req.url.endsWith('/reviews/order-items/7') && req.method === 'GET')
      .flush(null, { status: 204, statusText: 'No Content' });
    fixture.componentInstance.rating = 5;
    fixture.componentInstance.comment = 'Confortable';
    fixture.componentInstance.save();
    const save = http.expectOne(req => req.url.endsWith('/reviews/order-items/7') && req.method === 'PUT');
    expect(save.request.body).toEqual({ rating: 5, comment: 'Confortable' });
    save.flush({ id: 1, productName: 'Veste', rating: 5, comment: 'Confortable', createdAt: '2026-01-01', visible: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your review was saved.');
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.componentInstance.remove();
    http.expectOne(req => req.url.endsWith('/reviews/order-items/7') && req.method === 'DELETE')
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(fixture.componentInstance.review).toBeNull();
    expect(fixture.componentInstance.rating).toBe(0);
  });

  it('conserve le formulaire après un échec et indique un avis masqué', () => {
    const fixture = TestBed.createComponent(ReviewEditorComponent);
    fixture.componentRef.setInput('itemId', 7);
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    http.expectOne(req => req.method === 'GET').flush({
      id: 1, productName: 'Veste', rating: 3, comment: 'Mon avis', createdAt: '2026-01-01', visible: false
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('currently hidden');
    fixture.componentInstance.save();
    http.expectOne(req => req.method === 'PUT').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not');
    expect(fixture.componentInstance.comment).toBe('Mon avis');
  });

  it('permet à un administrateur de masquer et rétablir un avis', () => {
    const fixture = TestBed.createComponent(ReviewManagementComponent);
    fixture.detectChanges();
    const review = { id: 8, productName: 'Veste', rating: 4, comment: 'Confortable', createdAt: '2026-01-01', visible: true };
    http.expectOne(req => req.url.endsWith('/admin/reviews')).flush({
      content: [review], totalElements: 1, totalPages: 1, number: 0
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.toggle').click();
    const hide = http.expectOne(req => req.url.endsWith('/admin/reviews/8/visibility') && req.method === 'PATCH');
    expect(hide.request.body).toEqual({ visible: false });
    hide.flush({ ...review, visible: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hidden');
    fixture.nativeElement.querySelector('.toggle').click();
    const restore = http.expectOne(req => req.url.endsWith('/admin/reviews/8/visibility') && req.method === 'PATCH');
    expect(restore.request.body).toEqual({ visible: true });
    restore.flush(review);
  });
});
