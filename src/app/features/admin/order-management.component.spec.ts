import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminOrderDetail, AdminOrderService, AdminOrderSummary } from '../../core/admin-order.service';
import { PaginatedResponse } from '../../models/admin-product.model';
import { Order } from '../../models/order.model';
import { OrderManagementComponent } from './order-management.component';

describe('Gestion des commandes', () => {
  let service: jasmine.SpyObj<AdminOrderService>;
  const order: Order = {
    id: 1, userId: 2, deliveryAddressId: 3, orderNumber: 'CMD-001', dateOrder: '2026-01-01T10:00:00',
    taxAmount: 10, subtotal: 100, shippingOrder: 0, shippingCost: 0, shippingMethodName: 'Standard',
    deliveryType: 'HOME', deliveryMinDays: 2, deliveryMaxDays: 4, shippingFirstName: 'Ada',
    shippingLastName: 'Martin', shippingStreet: '1 rue', shippingCity: 'Paris', shippingState: 'Paris',
    shippingZipCode: '75000', shippingCountry: 'FR', shippingPhone: '0123',
    couponCodeUsed: 'CODE', discountAmount: 15, total: 100, status: 'PAID',
    createdAt: '', updatedAt: '', taxRate: 0.1, items: []
  };
  const detail: AdminOrderDetail = { order, customerEmail: 'client@example.com' };
  const sort = { sorted: true, unsorted: false, empty: false };
  const summary: AdminOrderSummary = {
    id: 1, orderNumber: 'CMD-001', dateOrder: order.dateOrder, customerName: 'Ada Martin',
    customerEmail: 'client@example.com', total: 100, status: 'PAID'
  };
  const page: PaginatedResponse<AdminOrderSummary> = {
    content: [summary], number: 0, totalElements: 1, totalPages: 1, size: 10,
    pageable: { pageNumber: 0, pageSize: 10, offset: 0, paged: true, unpaged: false, sort },
    first: true, last: true, empty: false, sort
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('AdminOrderService', ['list', 'detail', 'advance']);
    service.list.and.returnValue(of(page));
    service.detail.and.returnValue(of(detail));
    service.advance.and.returnValue(of({ ...detail, order: { ...order, status: 'PROCESSING' } }));
    TestBed.configureTestingModule({
      imports: [OrderManagementComponent],
      providers: [provideRouter([]), { provide: AdminOrderService, useValue: service }]
    });
  });

  it('recherche et filtre les commandes sur le serveur', () => {
    const fixture = TestBed.createComponent(OrderManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.search = '  Ada  ';
    component.status = 'PAID';
    component.load();
    expect(service.list).toHaveBeenCalledWith('Ada', 'PAID', 0);
    expect(component.total).toBe(1);
  });

  it('affiche le détail et confirme la prochaine étape sans modifier les montants', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(OrderManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.open(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('client@example.com');
    expect(component.itemDiscount(order)).toBe(10);
    component.advance();
    expect(service.advance).toHaveBeenCalledWith(1, 'PAID', 'PROCESSING');
    expect(component.detail?.order.status).toBe('PROCESSING');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('ne propose pas de préparation avant paiement et affiche les erreurs de concurrence', () => {
    const fixture = TestBed.createComponent(OrderManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.nextStatus('PENDING')).toBeNull();
    expect(component.nextStatus('DELIVERED')).toBeNull();
    service.advance.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Le statut a changé.' }
    })));
    spyOn(window, 'confirm').and.returnValue(true);
    component.open(1);
    component.advance();
    expect(component.detailError).toContain('Le statut a changé');
    expect(component.detail?.order.status).toBe('PAID');
  });
});
