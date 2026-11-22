import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { CheckoutIdempotencyService } from '../../core/checkout-idempotency-service';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable, catchError, finalize, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Address, AuthService, UpsertAddressPayload, User } from '../../core/auth.service';
import { CartItem, CartService } from '../../core/cart.service';
import { TaxService } from '../../core/tax.service';
import { ShippingDeliveryType, ShippingMethod } from '../../core/shipping-method.service';

interface UserAddressResponse {
  id: number;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  defaultAddress: boolean;
}

interface CheckoutPayload {
  addressId: number;
  shippingMethodId: number;
  leaveAtDoor?: boolean;
  requireSignature?: boolean;
  deliveryNote?: string;
  couponCode?: string;
}

interface CheckoutResponse {
  orderId: number;
  orderNumber: string;
  dateOrder: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  couponCodeUsed?: string | null;
  discountAmount?: number;
  shippingMethodName: string;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  paymentUrl?: string;
}

interface CouponPreviewResult {
  discountAmount: number;
  subtotal?: number;
  total?: number;
  taxRate?: number;
  taxAmount?: number;
  shippingCost?: number;
  couponCodeUsed?: string | null;
  couponApplied?: boolean;
  unitPrices?: Record<string, number>;
}

interface CouponPreviewPayload {
  couponCode: string;
  shippingMethodId?: number;
}

interface CouponRule {
  code: string;
  active: boolean;
  type: 'PERCENT' | 'AMOUNT' | 'FREE_SHIPPING' | 'UNKNOWN';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
}

interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  message: string;
  status: 'valid' | 'invalid' | 'pending';
  rule?: CouponRule | null;
  preview?: CouponPreviewResult | null;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly taxService = inject(TaxService);
  readonly cartService = inject(CartService);
  private readonly checkoutIdempotencyService = inject(CheckoutIdempotencyService);
  private readonly apiBase = (environment.apiBaseUrl || '').replace(/\/$/, '');

  step: 1 | 2 | 3 = 1;

  isLoadingAddresses = false;
  isSavingAddress = false;
  isLoadingShippingMethods = false;
  isPlacingOrder = false;

  addressError = '';
  shippingError = '';
  checkoutError = '';
  addressLoadFailed = false;
  shippingLoadFailed = false;
  addresses: Address[] = [];
  selectedAddressId: string | null = null;
  editingAddressIndex: number | null = null;

  shippingMethods: ShippingMethod[] = [];
  selectedShippingMethodId: number | null = null;

  leaveAtDoor = false;
  requireSignature = false;
  deliveryNote = '';
  couponCode = '';
  appliedCouponCode = '';
  couponInfoMessage = '';
  couponError = '';
  couponValidationStatus: 'idle' | 'valid' | 'invalid' | 'pending' = 'idle';
  isApplyingCoupon = false;
  previewDiscountAmount = 0;
  appliedCouponRule: CouponRule | null = null;
  exactCouponPreview: CouponPreviewResult | null = null;

  showAddAddressForm = false;
  newAddress: UpsertAddressPayload = this.getEmptyAddressForm();
  checkoutErrorAction: string = 'NONE';

  ngOnInit(): void {
    if (this.cartService.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    this.prefillAddressIdentity();
    this.loadTaxRate();
    this.loadAddresses();
    this.loadShippingMethods();
  }

  get currentUser(): User | null {
    return this.authService.currentUser;
  }

  get userDisplayName(): string {
    const user = this.currentUser;
    if (!user) {
      return 'Guest';
    }

    const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();
    return fullName || 'Client';
  }

  get selectedAddress(): Address | null {
    return this.addresses.find((address) => address.id === this.selectedAddressId) || null;
  }

  get selectedShippingMethod(): ShippingMethod | null {
    return this.shippingMethods.find((method) => method.id === this.selectedShippingMethodId) || null;
  }

  get isEditingAddress(): boolean {
    return this.editingAddressIndex !== null;
  }

  get canContinueToShipping(): boolean {
    return !!this.selectedAddress;
  }

  get canContinueToReview(): boolean {
    return !!this.selectedAddress && !!this.selectedShippingMethod;
  }

  get canConfirmOrder(): boolean {
    return this.canContinueToReview && !this.cartService.isEmpty() && this.deliveryNote.length <= 300
      && !this.showAddAddressForm && !this.isSavingAddress && !this.isLoadingAddresses
      && !this.isLoadingShippingMethods && !this.addressLoadFailed && !this.shippingLoadFailed
      && !this.isApplyingCoupon && (!this.appliedCouponCode || this.couponValidationStatus === 'valid');
  }

  get confirmationHint(): string {
    if (this.isLoadingAddresses || this.isLoadingShippingMethods) return 'Loading shipping information…';
    if (this.addressLoadFailed || this.shippingLoadFailed) return 'Rechargez les informations indisponibles pour continuer.';
    if (this.isSavingAddress) return 'Saving your address…';
    if (this.showAddAddressForm) return 'Save or cancel your address changes to continue.';
    if (!this.selectedAddress) return 'Choose or add a shipping address.';
    if (!this.selectedShippingMethod) return 'Choose a shipping method.';
    if (this.deliveryNote.length > 300) return 'Delivery instructions must be 300 characters or fewer.';
    if (this.isApplyingCoupon) return 'Checking your promo code…';
    if (this.appliedCouponCode && this.couponValidationStatus !== 'valid') return 'Check your promo code again before continuing.';
    return '';
  }

  get canApplyCoupon(): boolean {
    return !!this.selectedAddressId && !!this.selectedShippingMethodId && !!this.couponCode.trim() && !this.isApplyingCoupon;
  }

  get shippingPreview(): number {
    if (this.exactCouponPreview?.shippingCost !== undefined) {
      return this.exactCouponPreview.shippingCost;
    }

    const method = this.selectedShippingMethod;
    if (!method) {
      return 0;
    }
    return this.getShippingPreviewForMethod(method);
  }

  get taxPreview(): number {
    if (this.exactCouponPreview?.taxAmount !== undefined) {
      return this.exactCouponPreview.taxAmount;
    }

    return this.cartService.subtotal() * this.taxRate;
  }

  get taxRate(): number {
    return this.taxService.currentRate();
  }

  get taxPercentLabel(): string {
    return `${Number((this.taxRate * 100).toFixed(2))}`;
  }

  get estimatedTotal(): number {
    if (this.exactCouponPreview?.total !== undefined) {
      return this.exactCouponPreview.total;
    }

    return this.cartService.subtotal() + this.shippingPreview + this.taxPreview - this.discountPreview;
  }

  get discountPreview(): number {
    if (this.exactCouponPreview?.discountAmount !== undefined) {
      return this.exactCouponPreview.discountAmount;
    }

    return this.previewDiscountAmount;
  }

  getItemLineTotal(item: CartItem): number {
    return this.getItemUnitPrice(item) * item.quantity;
  }

  getItemUnitPrice(item: CartItem): number {
    const previewPrice = item.variantId == null ? undefined : this.exactCouponPreview?.unitPrices?.[item.variantId];
    return previewPrice ?? item.price;
  }

  get summarySubtotal(): number {
    return this.exactCouponPreview?.subtotal ?? this.cartService.subtotal();
  }

  get productSavings(): number {
    const savings = this.cartService.cartItems().reduce((sum, item) =>
      sum + Math.max(0, (item.basePrice ?? item.price) - this.getItemUnitPrice(item)) * item.quantity, 0);
    return Math.round(savings * 100) / 100;
  }

  get originalSubtotal(): number {
    return Math.round((this.summarySubtotal + this.productSavings) * 100) / 100;
  }

  get totalSavings(): number {
    return Math.round((this.productSavings + this.discountPreview) * 100) / 100;
  }

  getAddressTitle(address: Address, index: number): string {
    if (address.label && address.label.trim()) {
      return address.label;
    }

    return `Adresse ${index + 1}`;
  }

  getAddressLine(address: Address): string {
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter((item): item is string => !!item && item.trim().length > 0);

    return parts.join(', ');
  }

  getAddressContact(address: Address): string {
    const firstName = address.firstName || this.currentUser?.firstname || '';
    const lastName = address.lastName || this.currentUser?.lastname || '';
    return `${firstName} ${lastName}`.trim();
  }

  getShippingIcon(deliveryType: ShippingDeliveryType): string {
    if (deliveryType === 'HOME') {
      return 'bi-house-door';
    }
    if (deliveryType === 'HAND_TO_HAND') {
      return 'bi-hand-index-thumb';
    }
    if (deliveryType === 'LOCKER') {
      return 'bi-box-seam';
    }
    return 'bi-geo-alt';
  }

  getShippingEtaLabel(method: ShippingMethod): string {
    return `Delivery in ${method.minDeliveryDays}–${method.maxDeliveryDays} business days`;
  }

  isShippingFree(method: ShippingMethod): boolean {
    return method.price === 0 || (method.freeShippingThreshold !== null && this.summarySubtotal >= method.freeShippingThreshold);
  }

  getShippingPreviewForMethod(method: ShippingMethod): number {
    return this.isShippingFree(method) ? 0 : method.price;
  }

  selectAddress(addressId: string | undefined): void {
    if (!addressId) {
      return;
    }
    this.selectedAddressId = addressId;
    this.addressError = '';

    this.markCouponNeedsReapply();
  }

  selectShippingMethod(methodId: number): void {
    this.selectedShippingMethodId = methodId;
    this.shippingError = '';

    this.markCouponNeedsReapply();
  }

  onCouponCodeInputChange(value: string): void {
    this.couponCode = value;
    this.couponError = '';

    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      this.appliedCouponCode = '';
      this.previewDiscountAmount = 0;
      this.exactCouponPreview = null;
      this.couponValidationStatus = 'idle';
      this.couponInfoMessage = '';
      return;
    }

    this.appliedCouponCode = '';
    this.previewDiscountAmount = 0;
    this.exactCouponPreview = null;
    this.couponValidationStatus = 'idle';
    this.couponInfoMessage = 'Select Apply to check this code.';
  }

  onDeliveryPreferencesChanged(): void {
    this.markCouponNeedsReapply();
  }

  private markCouponNeedsReapply(): void {
    if (!this.appliedCouponCode) {
      return;
    }

    this.exactCouponPreview = null;
    this.previewDiscountAmount = 0;
    this.couponValidationStatus = 'pending';
    this.couponInfoMessage = 'Your information has changed. Select Apply to recalculate the discount.';
  }

  goToStep(step: 1 | 2 | 3): void {
    if (step === 2 && !this.canContinueToShipping) {
      this.addressError = 'Select an address first.';
      return;
    }
    if (step === 3 && !this.canContinueToReview) {
      this.shippingError = 'Select a shipping method first.';
      return;
    }
    this.step = step;
  }

  goToNextStep(): void {
    if (this.step === 1) {
      this.goToStep(2);
      return;
    }
    if (this.step === 2) {
      this.goToStep(3);
    }
  }

  goToPreviousStep(): void {
    if (this.step === 3) {
      this.step = 2;
      return;
    }
    if (this.step === 2) {
      this.step = 1;
    }
  }

  toggleAddAddress(): void {
    if (this.showAddAddressForm) {
      this.cancelAddressForm();
      return;
    }

    this.showAddAddressForm = true;
    this.editingAddressIndex = null;
    this.newAddress = this.getEmptyAddressForm();
    this.addressError = '';
  }

  startEditAddress(index: number): void {
    const target = this.addresses[index];
    if (!target) {
      return;
    }

    this.editingAddressIndex = index;
    this.showAddAddressForm = true;
    this.addressError = '';
    this.newAddress = {
      label: target.label || '',
      firstName: target.firstName || this.currentUser?.firstname || '',
      lastName: target.lastName || this.currentUser?.lastname || '',
      line1: target.line1 || '',
      line2: target.line2 || '',
      city: target.city || '',
      state: target.state || '',
      postalCode: target.postalCode || '',
      country: (target.country || 'US').toUpperCase(),
      phone: target.phone || '',
      isDefault: !!target.isDefault
    };
  }

  cancelAddressForm(): void {
    this.showAddAddressForm = false;
    this.editingAddressIndex = null;
    this.addressError = '';
    this.newAddress = this.getEmptyAddressForm();
  }

  saveAddress(): void {
    this.addressError = '';

    if (!this.isAddressFormValid()) {
      this.addressError = 'Check the required fields and formats.';
      return;
    }

    this.isSavingAddress = true;
    const payload = this.buildAddressPayloadForSave();

    const editingIndex = this.editingAddressIndex;
    const current = editingIndex !== null ? this.addresses[editingIndex] : null;
    const shouldUpdateBackend = editingIndex !== null && !!current?.id;

    const request$ = shouldUpdateBackend
      ? this.authService.updateAddress(current!.id!, payload)
      : this.authService.addAddress(payload);

    request$
      .pipe(finalize(() => (this.isSavingAddress = false)))
      .subscribe({
        next: (addresses) => {
          const normalized = this.applySingleDefault(addresses || []);
          this.addresses = normalized;
          this.authService.setLocalAddresses(normalized);

          if (editingIndex !== null && this.addresses[editingIndex]?.id) {
            this.selectedAddressId = this.addresses[editingIndex].id || null;
          } else {
            this.selectedAddressId = this.resolveSelectedAddressId();
          }

          this.cancelAddressForm();
        },
        error: (error) => {
          const backendMessage =
            error?.error?.message ||
            error?.error?.error ||
            error?.message;
          this.addressError = backendMessage
            ? `Could not save your address: ${backendMessage}`
            : 'Could not save your address right now. Please try again.';
        }
      });
  }

  placeOrder(): void {
    this.checkoutError = '';
    this.checkoutErrorAction = 'NONE';
    this.couponError = '';

    if (this.isPlacingOrder || !this.canConfirmOrder || !this.selectedAddressId || !this.selectedShippingMethodId) {
      return;
    }

    const payload = this.buildCheckoutPayload(this.appliedCouponCode);
    if (!payload) {
      this.checkoutError = 'The selected address is invalid. Choose another address.';
      return;
    }

    this.isPlacingOrder = true;
    const idempotencyKey = this.checkoutIdempotencyService.getOrCreateKey();

    this.http
      .post<CheckoutResponse>(`${this.apiBase}/api/orders/checkout`, payload, { headers: { 'Idempotency-Key': idempotencyKey } })
      .pipe(finalize(() => (this.isPlacingOrder = false)))
      .subscribe({
        next: (response) => {
            /*
          sessionStorage.setItem('last-order-confirmation', JSON.stringify(response));
          this.cartService.clearCart();
          this.router.navigate(['/order-confirmation', response.orderId]); */
          if(response && response.paymentUrl) {
            this.checkoutIdempotencyService.bindOrder(response.orderId);
            window.location.href = response.paymentUrl;
          } else {
            this.checkoutError = 'The payment link was not provided. Try again or contact customer support before placing another order.';
          }

        },
        error: (error) => {
          this.handleCheckoutError(error);
        }
      });
  }

  applyCoupon(): void {
    this.couponError = '';
    this.couponInfoMessage = '';
    this.exactCouponPreview = null;
    this.couponValidationStatus = 'idle';

    if (!this.selectedAddressId || !this.selectedShippingMethodId) {
      this.couponValidationStatus = 'pending';
      this.couponInfoMessage = 'Choose an address and shipping method before checking the code.';
      return;
    }

    const normalized = this.couponCode.trim().toUpperCase();
    if (!normalized) {
      this.appliedCouponCode = '';
      this.appliedCouponRule = null;
      this.previewDiscountAmount = 0;
      this.exactCouponPreview = null;
      this.couponValidationStatus = 'idle';
      return;
    }

    this.executeCouponValidation(normalized, true);
  }

  private executeCouponValidation(code: string, showFeedback: boolean): void {
    const addressId = this.selectedAddressId;
    const shippingMethodId = this.selectedShippingMethodId;
    this.isApplyingCoupon = true;
    this.validateCouponWithBackend(code)
      .pipe(finalize(() => (this.isApplyingCoupon = false)))
      .subscribe({
        next: (result) => {
          if (this.selectedAddressId !== addressId || this.selectedShippingMethodId !== shippingMethodId
              || this.couponCode.trim().toUpperCase() !== code) {
            if (this.couponCode.trim().toUpperCase() === code) {
              this.appliedCouponCode = code;
              this.exactCouponPreview = null;
              this.previewDiscountAmount = 0;
              this.couponValidationStatus = 'pending';
              this.couponInfoMessage = 'Your information has changed. Select Apply to recalculate the discount.';
            }
            return;
          }
          this.couponCode = code;

          if (result.status === 'invalid' || !result.valid) {
            this.appliedCouponCode = '';
            this.appliedCouponRule = null;
            this.previewDiscountAmount = 0;
            this.exactCouponPreview = null;
            this.couponValidationStatus = 'invalid';
            this.couponError = result.message || 'Coupon invalide.';
            return;
          }

          if (result.status === 'pending') {
            this.appliedCouponCode = code;
            this.appliedCouponRule = result.rule ?? null;
            this.previewDiscountAmount = 0;
            this.exactCouponPreview = null;
            this.couponValidationStatus = 'pending';
            this.couponError = '';
            this.couponInfoMessage = result.message;
            return;
          }

          this.appliedCouponCode = code;
          this.appliedCouponRule = result.rule ?? null;
          this.previewDiscountAmount = result.discountAmount;
          this.exactCouponPreview = result.preview ?? null;
          this.couponValidationStatus = 'valid';
          this.couponError = '';
          if (showFeedback || !!result.message) {
            this.couponInfoMessage = result.message;
          }
        },
        error: () => {
          this.appliedCouponCode = code;
          this.couponCode = code;
          this.couponError = '';
          this.couponValidationStatus = 'pending';
          this.couponInfoMessage = 'Coupon enregistre. Verification backend temporairement indisponible.';
        }
      });
  }

  private validateCouponWithBackend(code: string): Observable<CouponValidationResult> {
    const payload = this.buildCouponPreviewPayload(code);
    if (payload) {
      return this.http
        .post<unknown>(`${this.apiBase}/api/coupons/preview`, payload)
        .pipe(
          map((response) => {
            const preview = this.normalizeCouponPreview(response);
            if (!preview) {
              throw new Error('preview-unavailable');
            }

            return {
              valid: true,
              discountAmount: preview.discountAmount,
              status: 'valid',
              message: preview.couponApplied === false
                ? 'The cart promotion offers a better discount, so the coupon will not be used.'
                : preview.discountAmount > 0
                ? `You save $${preview.discountAmount.toFixed(2)}.`
                : 'The coupon is valid, but does not apply to this cart.',
              preview
            } satisfies CouponValidationResult;
          }),
          catchError((error) => {
            const status = Number(error?.status || 0);
            const message = String(error?.error?.message || error?.error?.error || error?.message || '').trim();

            if (status === 401) {
              this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } });
              return of({
                valid: false,
                discountAmount: 0,
                status: 'pending',
                message: 'Session expiree. Reconnecte-toi pour verifier le coupon.'
              } satisfies CouponValidationResult);
            }

            if ((status === 400 || status === 404 || status === 422) && /coupon|code promo|invalid|invalide|expired|expire|already used|minimum/i.test(message)) {
              return of({
                valid: false,
                discountAmount: 0,
                status: 'invalid',
                message: message || 'Coupon invalide.'
              } satisfies CouponValidationResult);
            }

            return of({
              valid: false,
              discountAmount: 0,
              status: 'pending',
              message: 'Could not check the coupon right now. Please try again.'
            } satisfies CouponValidationResult);
          })
        );
    }

    return of({
      valid: false,
      discountAmount: 0,
      status: 'pending',
      message: 'Choose an address and shipping method to check this coupon.'
    } satisfies CouponValidationResult);
  }

  private normalizeCouponPreview(raw: unknown): CouponPreviewResult | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const record = raw as Record<string, unknown>;
    const discountAmount = this.toNumber(record['discountAmount']) ?? this.toNumber(record['couponDiscount']);

    if (discountAmount === undefined) {
      return null;
    }

    return {
      discountAmount: Math.max(0, discountAmount),
      subtotal: this.toNumber(record['subtotal']),
      total: this.toNumber(record['total']),
      taxRate: this.toNumber(record['taxRate']),
      taxAmount: this.toNumber(record['taxAmount']),
      shippingCost: this.toNumber(record['shippingCost']),
      couponCodeUsed: this.toText(record['couponCodeUsed']) ?? this.toText(record['couponCode']),
      couponApplied: this.toBoolean(record['couponApplied']) ?? true,
      unitPrices: this.readPreviewUnitPrices(record['unitPrices'])
    };
  }

  private readPreviewUnitPrices(value: unknown): Record<string, number> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const result: Record<string, number> = {};
    for (const [variantId, price] of Object.entries(value)) {
      const parsed = this.toNumber(price);
      if (parsed !== undefined) result[variantId] = parsed;
    }
    return result;
  }

  private buildCouponPreviewPayload(couponCode: string): CouponPreviewPayload | null {
    if (!this.selectedAddressId || !this.selectedShippingMethodId) {
      return null;
    }

    return {
      couponCode,
      shippingMethodId: this.selectedShippingMethodId
    };
  }

  private buildCheckoutPayload(couponCode?: string): CheckoutPayload | null {
    if (!this.selectedAddressId || !this.selectedShippingMethodId) {
      return null;
    }

    const parsedAddressId = Number(this.selectedAddressId);
    if (!Number.isFinite(parsedAddressId)) {
      return null;
    }

    return {
      addressId: parsedAddressId,
      shippingMethodId: this.selectedShippingMethodId,
      leaveAtDoor: !!this.leaveAtDoor,
      requireSignature: !!this.requireSignature,
      deliveryNote: this.deliveryNote.trim() ? this.deliveryNote.trim() : undefined,
      couponCode: couponCode || undefined
    };
  }

  private loadCouponRules(): Observable<CouponRule[]> {
    const url = `${this.apiBase}/api/coupons`;
    return this.http.get<unknown[]>(url).pipe(
      map((rows) => (rows || []).map((row) => this.normalizeCouponRule(row)).filter((x): x is CouponRule => !!x)),
      catchError(() => of([]))
    );
  }

  private normalizeCouponRule(raw: unknown): CouponRule | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const r = raw as Record<string, unknown>;
    const code = this.toText(r['code']) || this.toText(r['couponCode']);
    if (!code) {
      return null;
    }

    const active = this.toBoolean(r['active']) ?? this.toBoolean(r['enabled']) ?? true;
    const typeRaw = (this.toText(r['discountType']) || this.toText(r['type']) || this.toText(r['couponType']) || '').toUpperCase();
    const value = this.toNumber(r['discountValue']) ?? this.toNumber(r['value']) ?? this.toNumber(r['amount']) ?? 0;
    const minOrderAmount = this.toNumber(r['minOrderAmount']) ?? this.toNumber(r['minimumOrderAmount']);
    const maxDiscountAmount = this.toNumber(r['maxDiscountAmount']) ?? this.toNumber(r['maxDiscount']);

    let type: CouponRule['type'] = 'UNKNOWN';
    if (typeRaw.includes('FREE') && typeRaw.includes('SHIP')) {
      type = 'FREE_SHIPPING';
    } else if (typeRaw.includes('PERCENT')) {
      type = 'PERCENT';
    } else if (typeRaw.includes('FIXED') || typeRaw.includes('AMOUNT')) {
      type = 'AMOUNT';
    }

    return { code: code.toUpperCase(), active, type, value, minOrderAmount, maxDiscountAmount };
  }

  private computeCouponDiscount(rule: CouponRule): CouponPreviewResult {
    const subtotal = this.cartService.subtotal();
    const shipping = this.shippingPreview;

    if (rule.minOrderAmount !== undefined && subtotal < rule.minOrderAmount) {
      return { discountAmount: 0 };
    }

    let discount = 0;
    if (rule.type === 'FREE_SHIPPING') {
      discount = shipping;
    } else if (rule.type === 'PERCENT') {
      const percent = rule.value > 1 ? rule.value / 100 : rule.value;
      discount = subtotal * Math.max(0, percent);
    } else if (rule.type === 'AMOUNT') {
      discount = Math.max(0, rule.value);
    }

    if (rule.maxDiscountAmount !== undefined) {
      discount = Math.min(discount, rule.maxDiscountAmount);
    }

    discount = Math.min(discount, subtotal + shipping);
    return { discountAmount: Math.max(0, discount), couponCodeUsed: rule.code };
  }

  private buildCouponEligibilityMessage(rule: CouponRule): string {
    const subtotal = this.cartService.subtotal();
    if (rule.minOrderAmount !== undefined && subtotal < rule.minOrderAmount) {
      return `Minimum order for this coupon is ${rule.minOrderAmount.toFixed(2)} USD.`;
    }
    if (rule.type === 'UNKNOWN') {
      return 'Coupon type is not supported for preview. Final validation happens at order confirmation.';
    }
    return '';
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private toText(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || undefined;
    }
    return undefined;
  }

  private toBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        return undefined;
      }
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }
    return undefined;
  }

  getFirstNameError(): string {
    const value = (this.newAddress.firstName || '').trim();
    if (!value) {
      return 'First name is required.';
    }
    if (value.length > 80) {
      return 'First name must be 80 characters or fewer.';
    }
    return '';
  }

  getLastNameError(): string {
    const value = (this.newAddress.lastName || '').trim();
    if (!value) {
      return 'Last name is required.';
    }
    if (value.length > 80) {
      return 'Last name must be 80 characters or fewer.';
    }
    return '';
  }

  getLabelError(): string {
    const value = (this.newAddress.label || '').trim();
    if (!value) {
      return 'Address label is required.';
    }
    if (value.length > 30) {
      return 'Address label must be 30 characters or fewer.';
    }
    return '';
  }

  getStateError(): string {
    const value = (this.newAddress.state || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(value) ? '' : 'Enter a two-letter state code, such as CA.';
  }

  getZipCodeError(): string {
    const value = (this.newAddress.postalCode || '').trim();
    return /^\d{5}(?:-\d{4})?$/.test(value) ? '' : 'Use 12345 or 12345-6789.';
  }

  getPhoneError(): string {
    const value = (this.newAddress.phone || '').trim();
    return /^(\+1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}$/.test(value)
      ? ''
      : 'Use (212) 555-0102 or 212-555-0102.';
  }

  getCountryError(): string {
    const value = (this.newAddress.country || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(value) ? '' : 'Enter a two-letter country code, such as US.';
  }

  getDeliveryNoteError(): string {
    return this.deliveryNote.length <= 300 ? '' : 'Delivery instructions must be 300 characters or fewer.';
  }

  trackByAddress(index: number, address: Address): string {
    return address.id || `${address.label || 'address'}-${index}`;
  }

  trackByShippingMethod(index: number, method: ShippingMethod): number {
    return method.id;
  }

  getSelectedAddressLine(address: Address | null): string {
    if (!address) {
      return '-';
    }
    return this.getAddressLine(address);
  }

  getSelectedMethodLine(method: ShippingMethod | null): string {
    if (!method) {
      return '-';
    }
    return `${method.name} - ${this.getShippingEtaLabel(method)}`;
  }

  loadAddresses(forceRefresh = false): void {
    if (!forceRefresh) {
      const localAddresses = this.authService.getLocalAddresses();
      this.addresses = localAddresses;
      this.selectedAddressId = this.resolveSelectedAddressId();
    }

    this.addressLoadFailed = false;
    this.addressError = '';
    this.isLoadingAddresses = true;
    this.http
      .get<UserAddressResponse[]>(`${this.apiBase}/api/users/addresses`)
      .pipe(
        catchError(() => this.authService.getMyAddresses(false)),
        finalize(() => (this.isLoadingAddresses = false))
      )
      .subscribe({
        next: (response) => {
          const addresses = this.normalizeAddresses(response);
          this.addresses = addresses;
          this.selectedAddressId = this.resolveSelectedAddressId();
          this.authService.setLocalAddresses(this.addresses);
        },
        error: () => {
          this.addresses = [];
          this.selectedAddressId = null;
          this.addressLoadFailed = true;
          this.addressError = 'Could not load your addresses. Try again before continuing.';
        }
      });
  }

  loadShippingMethods(forceRefresh = false): void {
    if (forceRefresh) {
      this.selectedShippingMethodId = null;
    }

    this.shippingLoadFailed = false;
    this.shippingError = '';
    this.isLoadingShippingMethods = true;
    this.http
      .get<ShippingMethod[]>(`${this.apiBase}/api/shipping-methods`)
      .pipe(finalize(() => (this.isLoadingShippingMethods = false)))
      .subscribe({
        next: (methods) => {
          this.shippingMethods = (methods || []).filter((method) =>
            method.active && (method.deliveryType === 'HOME' || method.deliveryType === 'HAND_TO_HAND'));
          if (!this.shippingMethods.length) {
            this.shippingError = 'No shipping methods are available right now.';
          }
          if (this.selectedShippingMethodId && !this.shippingMethods.some((method) => method.id === this.selectedShippingMethodId)) {
            this.selectedShippingMethodId = null;
          }
        },
        error: () => {
          this.shippingMethods = [];
          this.selectedShippingMethodId = null;
          this.shippingLoadFailed = true;
          this.shippingError = 'Could not load shipping methods. Please try again.';
        }
      });
  }

  private normalizeAddresses(raw: UserAddressResponse[] | Address[]): Address[] {
    return (raw || [])
      .map((item, index) => {
        const record = item as UserAddressResponse;
        return {
          id: record.id !== undefined && record.id !== null ? String(record.id) : undefined,
          label: record.label || `Adresse ${index + 1}`,
          firstName: record.firstName,
          lastName: record.lastName,
          line1: record.street || (item as Address).line1 || '',
          line2: (item as Address).line2 || '',
          city: record.city || (item as Address).city || '',
          state: record.state || (item as Address).state || '',
          postalCode: record.zipCode || (item as Address).postalCode || '',
          country: record.country || (item as Address).country || 'US',
          phone: record.phone || (item as Address).phone || '',
          isDefault: !!record.defaultAddress || !!(item as Address).isDefault
        } satisfies Address;
      })
      .filter((address) => !!address.id && !!address.line1);
  }

  private prefillAddressIdentity(): void {
    const user = this.currentUser;
    if (!user) {
      return;
    }
    this.newAddress.firstName = user.firstname || '';
    this.newAddress.lastName = user.lastname || '';
    this.newAddress.country = 'US';
  }

  private loadTaxRate(): void {
    this.taxService.loadCurrentTaxRate().subscribe();
  }

  private applySingleDefault(addresses: Address[]): Address[] {
    const defaultIndex = addresses.findIndex((address) => !!address.isDefault);
    if (defaultIndex < 0) {
      return addresses;
    }

    return addresses.map((address, index) => ({
      ...address,
      isDefault: index === defaultIndex
    }));
  }

  private resolveSelectedAddressId(): string | null {
    if (!this.addresses.length) {
      return null;
    }

    if (this.selectedAddressId && this.addresses.some((address) => address.id === this.selectedAddressId)) {
      return this.selectedAddressId;
    }

    const defaultAddress = this.addresses.find((address) => !!address.isDefault && !!address.id);
    return defaultAddress?.id || this.addresses[0]?.id || null;
  }

  private isAddressFormValid(): boolean {
    const city = (this.newAddress.city || '').trim();
    const line1 = (this.newAddress.line1 || '').trim();

    return !!(
      !this.getFirstNameError() &&
      !this.getLastNameError() &&
      !this.getLabelError() &&
      line1 &&
      city &&
      !this.getStateError() &&
      !this.getZipCodeError() &&
      !this.getPhoneError() &&
      !this.getCountryError()
    );
  }

  private buildAddressPayloadForSave(): UpsertAddressPayload {
    return {
      label: (this.newAddress.label || '').trim(),
      firstName: (this.newAddress.firstName || '').trim(),
      lastName: (this.newAddress.lastName || '').trim(),
      line1: (this.newAddress.line1 || '').trim(),
      line2: (this.newAddress.line2 || '').trim() || undefined,
      city: (this.newAddress.city || '').trim(),
      state: (this.newAddress.state || '').trim().toUpperCase(),
      postalCode: (this.newAddress.postalCode || '').trim() || undefined,
      country: (this.newAddress.country || '').trim().toUpperCase(),
      phone: (this.newAddress.phone || '').trim() || undefined,
      isDefault: !!this.newAddress.isDefault,
      defaultAddress: !!this.newAddress.isDefault
    };
  }

  private getEmptyAddressForm(): UpsertAddressPayload {
    return {
      label: '',
      firstName: this.currentUser?.firstname || '',
      lastName: this.currentUser?.lastname || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: false
    };
  }

   private handleCheckoutError(error: any): void {
        const code = error?.error?.code;

        // Reset
        this.checkoutError = "";
        this.checkoutErrorAction = 'NONE';

        switch (code) {

            // ============================================================
            // CART / PRODUCTS
            // ============================================================

            case 'CART_NOT_FOUND':
            case 'CART_IS_EMPTY':
            case 'QUANTITY_MUST_BE_GREATER_THAN_ZERO':
            case 'ORDER_MUST_HAVE_AT_LEAST_ONE_ITEM':
            case 'VARIANT_NOT_FOUND':
            case 'STOCK_NOT_FOUND_FOR_VARIANT':
            this.checkoutError =
                'There is a problem with your cart. Review it before trying again.';
            this.checkoutErrorAction = 'CART';
            break;


            // ============================================================
            // STOCK
            // ============================================================

            case 'INSUFFICIENT_STOCK':
            this.checkoutError =
                'One or more items are no longer available in the requested quantity. Review your cart.';
            this.checkoutErrorAction = 'CART';
            break;


            // ============================================================
            // DELIVERY ADDRESS
            // ============================================================

            case 'DELIVERY_ADDRESS_REQUIRED':
            case 'DELIVERY_ADDRESS_NOT_FOUND':
            this.checkoutError =
                'This address cannot be used. Choose a valid address and try again.';
            this.checkoutErrorAction = 'NONE';
            break;
            

            // ============================================================
            // SHIPPING
            // ============================================================

            case 'SHIPPING_METHOD_NOT_FOUND':
            case 'SHIPPING_METHOD_UNAVAILABLE':
            this.checkoutError =
                'This shipping method is no longer available. Choose another and try again.';
            this.checkoutErrorAction = 'NONE';
            break;


            // ============================================================
            // USER / ORDER
            // ============================================================

            case 'USER_NOT_FOUND':
            this.checkoutError =
                'Your account could not be found. Sign in again and retry.';
            this.checkoutErrorAction = 'NONE';
            break;

            case 'ORDER_NOT_FOUND':
            this.checkoutError =
                'Your order could not be found. Please try again.';
            this.checkoutErrorAction = 'NONE';
            break;


            // ============================================================
            // PAYMENT
            // ============================================================

            case 'STRIPE_SESSION_CREATION_FAILED':
            this.checkoutError =
                'Could not start payment. Please try again.';
            this.checkoutErrorAction = 'NONE';
            break;


            // ============================================================
            // UNKNOWN ERROR
            // ============================================================

            default:
            this.checkoutError =
                'Could not continue checkout right now. Please try again.';
            this.checkoutErrorAction = 'NONE';
            break;
        }
        }


}
