import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  it('shows operational counts and links to a recent order', () => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/admin/dashboard').flush({
      readyToPrepare: 2, processing: 1, unavailableVariants: 3,
      recentOrders: [{ id: 8, orderNumber: 'ORD-8', customerName: 'Alex',
        customerEmail: 'alex@example.test', dateOrder: '2026-01-02T10:00:00', total: 25, status: 'PAID' }],
      unavailableItems: [{ productId: 7, productName: 'Shirt', sku: 'SKU-7' }]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ORD-8');
    expect(fixture.nativeElement.textContent).toContain('$25.00');
    expect(fixture.nativeElement.querySelector('.order').getAttribute('href')).toContain('orderId=8');
    expect(fixture.nativeElement.querySelector('.inventory .order').getAttribute('href')).toContain('/admin/products/7');
    http.verify();
  });
});
