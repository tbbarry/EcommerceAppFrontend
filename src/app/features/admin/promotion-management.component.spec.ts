import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PromotionManagementComponent } from './promotion-management.component';

describe('Gestion des promotions', () => {
  let fixture: ComponentFixture<PromotionManagementComponent>;
  let component: PromotionManagementComponent;
  let http: HttpTestingController;

  const promo = {
    id: 1, code: 'ETE', discountValue: 20,
    startDate: '2026-01-01T10:00:00', endDate: '2027-01-01T10:00:00', isActive: true
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PromotionManagementComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PromotionManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/promos/admin').flush([promo]);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('creates a promotion with its dates and refreshes the list', () => {
    component.openEditor();
    component.form.setValue({
      code: ' SOLDES ', discountValue: 15, startDate: '2026-12-01T09:00',
      endDate: '2026-12-31T23:00', isActive: true
    });
    component.save();
    const request = http.expectOne('/api/promos');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      code: 'SOLDES', discountValue: 15, startDate: '2026-12-01T09:00',
      endDate: '2026-12-31T23:00', isActive: true
    });
    request.flush({ ...promo, id: 2 });
    http.expectOne('/api/promos/admin').flush([promo]);
    expect(component.editorOpen).toBeFalse();
  });

  it('rejects an invalid date range without sending a request', () => {
    component.openEditor();
    component.form.setValue({
      code: 'SOLDES', discountValue: 10, startDate: '2026-12-31T09:00',
      endDate: '2026-12-01T09:00', isActive: true
    });
    component.save();
    expect(component.errorMessage).toContain('date de fin');
    http.expectNone('/api/promos');
  });

  it('links each promotion to its own assignments page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[aria-label="Gérer les produits de ETE"]');
    expect(link.getAttribute('href')).toBe('/admin/promotions/1/assignments');
    expect(component.canLeave()).toBeTrue();
  });

  it('preserves the form and shows backend errors when saving fails', () => {
    component.openEditor();
    component.form.patchValue({ code: 'SOLDES' });
    component.save();
    http.expectOne('/api/promos').flush({ message: 'Nom déjà utilisé' }, { status: 400, statusText: 'Bad Request' });
    expect(component.errorMessage).toContain('Nom déjà utilisé');
    expect(component.editorOpen).toBeTrue();
    expect(component.form.controls.code.value).toBe('SOLDES');
  });
});
