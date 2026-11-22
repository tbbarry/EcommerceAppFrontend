import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartItem, CartService } from '../../core/cart.service';
import { CheckoutIdempotencyService } from '../../core/checkout-idempotency-service';
import { TaxService } from '../../core/tax.service';
import { CheckoutComponent } from './checkout.component';

describe('Aperçu de la meilleure offre au paiement', () => {
  let component: CheckoutComponent;
  let http: HttpTestingController;
  const item: CartItem = {
    variantId: 9, productId: 1, slug: 'article', name: 'Article', price: 40, basePrice: 50,
    imageUrl: null, imageAlt: null, color: null, size: null, quantity: 2, maxStock: 5
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: {} },
        { provide: CartService, useValue: { subtotal: () => 80, isEmpty: () => false, cartItems: () => [item] } },
        { provide: TaxService, useValue: {} },
        { provide: CheckoutIdempotencyService, useValue: { getOrCreateKey: () => 'test-key' } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    component = TestBed.createComponent(CheckoutComponent).componentInstance;
    component.selectedAddressId = '2';
    component.selectedShippingMethodId = 3;
    component.couponCode = 'CODE';
  });

  afterEach(() => http.verify());

  it('does not offer pickup points or lockers without a pickup location', () => {
    component.loadShippingMethods();
    http.expectOne('/api/shipping-methods').flush([
      { id: 1, active: true, deliveryType: 'HOME' },
      { id: 2, active: true, deliveryType: 'HAND_TO_HAND' },
      { id: 3, active: true, deliveryType: 'PICKUP_POINT' },
      { id: 4, active: true, deliveryType: 'LOCKER' }
    ]);
    expect(component.shippingMethods.map(method => method.id)).toEqual([1, 2]);
  });

  it('shows the prices and subtotal returned when the coupon wins', () => {
    component.applyCoupon();
    const request = http.expectOne('/api/coupons/preview');
    expect(request.request.body).toEqual({ couponCode: 'CODE', shippingMethodId: 3 });
    request.flush({
      couponCode: 'CODE', couponApplied: true, discountAmount: 30,
      subtotal: 100, shippingCost: 0, taxAmount: 14, total: 84, unitPrices: { 9: 50 }
    });

    expect(component.summarySubtotal).toBe(100);
    expect(component.getItemUnitPrice(item)).toBe(50);
    expect(component.getItemLineTotal(item)).toBe(100);
    expect(component.originalSubtotal).toBe(100);
    expect(component.productSavings).toBe(0);
    expect(component.totalSavings).toBe(30);
    expect(component.estimatedTotal).toBe(84);
  });

  it('explains when existing promotions are better than the coupon', () => {
    component.applyCoupon();
    http.expectOne('/api/coupons/preview').flush({
      couponCode: null, couponApplied: false, discountAmount: 0,
      subtotal: 80, shippingCost: 0, taxAmount: 16, total: 96, unitPrices: { 9: 40 }
    });

    expect(component.couponInfoMessage).toContain('better discount');
    expect(component.exactCouponPreview?.couponApplied).toBeFalse();
    expect(component.getItemUnitPrice(item)).toBe(40);
    expect(component.originalSubtotal).toBe(100);
    expect(component.productSavings).toBe(20);
    expect(component.totalSavings).toBe(20);
    expect(component.estimatedTotal).toBe(96);
  });

  it('displays promotional savings without deducting them a second time', () => {
    expect(component.originalSubtotal).toBe(100);
    expect(component.totalSavings).toBe(20);
    component.exactCouponPreview = {
      subtotal: 100, unitPrices: { 9: 50 }, discountAmount: 30, shippingCost: 0, taxAmount: 14, total: 84
    };
    expect(component.originalSubtotal).toBe(100);
    expect(component.totalSavings).toBe(30);
    expect(component.estimatedTotal).toBe(84);
  });

  it('blocks payment while an address form is open or being saved', () => {
    component.addresses = [{ id: '2', line1: '123 Main St' }];
    component.shippingMethods = [{
      id: 3, name: 'Standard', code: 'STANDARD', deliveryType: 'HOME', description: '',
      minDeliveryDays: 2, maxDeliveryDays: 4, price: 5, freeShippingThreshold: null, active: true
    }];
    expect(component.canConfirmOrder).toBeTrue();
    component.showAddAddressForm = true;
    expect(component.canConfirmOrder).toBeFalse();
    component.showAddAddressForm = false;
    component.isSavingAddress = true;
    expect(component.canConfirmOrder).toBeFalse();
  });

  it('requires a fresh coupon preview before payment after delivery changes', () => {
    component.addresses = [{ id: '2', line1: '123 Main St' }];
    component.shippingMethods = [{
      id: 3, name: 'Standard', code: 'STANDARD', deliveryType: 'HOME', description: '',
      minDeliveryDays: 2, maxDeliveryDays: 4, price: 5, freeShippingThreshold: null, active: true
    }];
    component.appliedCouponCode = 'CODE';
    component.couponValidationStatus = 'valid';
    expect(component.canConfirmOrder).toBeTrue();
    component.selectShippingMethod(3);
    expect(component.canConfirmOrder).toBeFalse();
    expect(component.confirmationHint).toContain('Check your promo code again');
  });

  it('discards a coupon preview if the delivery method changes while it is loading', () => {
    component.addresses = [{ id: '2', line1: '123 Main St' }];
    component.shippingMethods = [
      { id: 3, name: 'Standard', code: 'STANDARD', deliveryType: 'HOME', description: '',
        minDeliveryDays: 2, maxDeliveryDays: 4, price: 5, freeShippingThreshold: null, active: true },
      { id: 4, name: 'Express', code: 'EXPRESS', deliveryType: 'HOME', description: '',
        minDeliveryDays: 1, maxDeliveryDays: 2, price: 10, freeShippingThreshold: null, active: true }
    ];
    component.applyCoupon();
    const request = http.expectOne('/api/coupons/preview');
    component.selectShippingMethod(4);
    request.flush({ couponApplied: true, discountAmount: 10, subtotal: 100, total: 98, unitPrices: { 9: 50 } });

    expect(component.exactCouponPreview).toBeNull();
    expect(component.couponValidationStatus).toBe('pending');
    expect(component.canConfirmOrder).toBeFalse();
  });

  it('reports a missing payment URL and a checkout error without a code', () => {
    component.addresses = [{ id: '2', line1: '123 Main St' }];
    component.shippingMethods = [{
      id: 3, name: 'Standard', code: 'STANDARD', deliveryType: 'HOME', description: '',
      minDeliveryDays: 2, maxDeliveryDays: 4, price: 5, freeShippingThreshold: null, active: true
    }];
    component.placeOrder();
    http.expectOne('/api/orders/checkout').flush({});
    expect(component.checkoutError).toContain('payment link');
    component.placeOrder();
    http.expectOne('/api/orders/checkout').flush({}, { status: 500, statusText: 'Server Error' });
    expect(component.checkoutError).toContain('Could not continue checkout');
  });

  it('explains when a previously selected delivery method is unavailable', () => {
    component.addresses = [{ id: '2', line1: '123 Main St' }];
    component.shippingMethods = [{
      id: 3, name: 'Standard', code: 'STANDARD', deliveryType: 'HOME', description: '',
      minDeliveryDays: 2, maxDeliveryDays: 4, price: 5, freeShippingThreshold: null, active: true
    }];
    component.placeOrder();
    http.expectOne('/api/orders/checkout').flush(
      { code: 'SHIPPING_METHOD_UNAVAILABLE' }, { status: 400, statusText: 'Bad Request' });
    expect(component.checkoutError).toContain('shipping method');
  });
});
