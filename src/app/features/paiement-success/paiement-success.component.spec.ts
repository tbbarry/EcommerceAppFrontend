import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CartService } from '../../core/cart.service';
import { CheckoutIdempotencyService } from '../../core/checkout-idempotency-service';
import { PaymentConfirmationResponse, PaymentService } from '../../core/payment.service';
import { PaymentSuccessComponent } from './paiement-success.component';

describe('Confirmation du paiement', () => {
  let payments: jasmine.SpyObj<PaymentService>;
  let cart: jasmine.SpyObj<CartService>;
  let idempotency: jasmine.SpyObj<CheckoutIdempotencyService>;
  const pending: PaymentConfirmationResponse = {
    paid: false, paymentStatus: 'PENDING', orderStatus: 'PENDING',
    orderId: 'CMD-1', orderDatabaseId: 1, amount: 89
  };
  const paid: PaymentConfirmationResponse = { ...pending, paid: true, paymentStatus: 'PAID', orderStatus: 'PAID' };

  beforeEach(() => {
    payments = jasmine.createSpyObj('PaymentService', ['verifyPayment', 'reconcilePayment']);
    cart = jasmine.createSpyObj('CartService', ['refreshCart']);
    idempotency = jasmine.createSpyObj('CheckoutIdempotencyService', ['clearForOrder']);
    TestBed.configureTestingModule({
      imports: [PaymentSuccessComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ session_id: 'cs_test_1' }) } } },
        { provide: PaymentService, useValue: payments },
        { provide: CartService, useValue: cart },
        { provide: CheckoutIdempotencyService, useValue: idempotency }
      ]
    });
  });

  it('conserve le panier et la clé tant que le paiement est en attente', fakeAsync(() => {
    payments.reconcilePayment.and.returnValue(of(pending));
    payments.verifyPayment.and.returnValue(of(pending));
    const fixture = TestBed.createComponent(PaymentSuccessComponent);
    fixture.detectChanges();
    tick(16000);
    fixture.detectChanges();
    expect(fixture.componentInstance.paymentConfirmed).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Confirmation pending');
    expect(idempotency.clearForOrder).not.toHaveBeenCalled();
    expect(cart.refreshCart).not.toHaveBeenCalled();
    fixture.destroy();
  }));

  it('actualise le panier une seule fois après confirmation', fakeAsync(() => {
    payments.reconcilePayment.and.returnValue(of(pending));
    payments.verifyPayment.and.returnValue(of(paid));
    const fixture = TestBed.createComponent(PaymentSuccessComponent);
    fixture.detectChanges();
    expect(idempotency.clearForOrder).not.toHaveBeenCalled();
    tick(2000);
    fixture.detectChanges();
    expect(fixture.componentInstance.paymentConfirmed).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('CMD-1');
    expect(idempotency.clearForOrder).toHaveBeenCalledOnceWith(1);
    expect(cart.refreshCart).toHaveBeenCalledTimes(1);
    fixture.destroy();
  }));

  it('propose une reconnexion sans annoncer un échec de paiement', () => {
    payments.reconcilePayment.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = TestBed.createComponent(PaymentSuccessComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.needsLogin).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Sign in again');
    expect(idempotency.clearForOrder).not.toHaveBeenCalled();
  });

  it('explique qu’un backend sans endpoint de vérification doit être mis à jour', () => {
    payments.reconcilePayment.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(PaymentSuccessComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('server cannot verify');
    expect(idempotency.clearForOrder).not.toHaveBeenCalled();
  });

  it('distingue une session introuvable d’un endpoint absent', () => {
    payments.reconcilePayment.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 404, error: { code: 'PAYMENT_NOT_FOUND' }
    })));
    const fixture = TestBed.createComponent(PaymentSuccessComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('payment session could not be found');
    expect(cart.refreshCart).not.toHaveBeenCalled();
  });
});

describe('Clé de commande', () => {
  const service = new CheckoutIdempotencyService();
  afterEach(() => service.clear());

  it('ne supprime pas la clé associée à une autre commande', () => {
    sessionStorage.setItem('checkout_idempotency_key', 'key');
    service.bindOrder(2);
    service.clearForOrder(1);
    expect(sessionStorage.getItem('checkout_idempotency_key')).toBe('key');
    service.clearForOrder(2);
    expect(sessionStorage.getItem('checkout_idempotency_key')).toBeNull();
  });
});
