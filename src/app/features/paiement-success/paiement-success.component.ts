import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { exhaustMap, finalize, of, startWith, switchMap, take, takeWhile, timer } from 'rxjs';
import { CartService } from '../../core/cart.service';
import { CheckoutIdempotencyService } from '../../core/checkout-idempotency-service';
import { PaymentService } from '../../core/payment.service';

@Component({
  selector: 'app-paiement-success',
  imports: [CommonModule, RouterModule],
  templateUrl: './paiement-success.component.html',
  styleUrl: './paiement-success.component.css'
})
export class PaymentSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentService);
  private readonly idempotency = inject(CheckoutIdempotencyService);
  private readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);

  sessionId = '';
  isLoading = false;
  paymentConfirmed = false;
  needsLogin = false;
  errorMessage: string | null = null;
  orderId: string | null = null;
  amount: number | null = null;

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id') ?? '';
    if (!this.sessionId) {
      this.errorMessage = 'The payment session could not be found.';
      return;
    }
    this.verify();
  }

  verify(): void {
    if (!this.sessionId || this.isLoading) return;
    this.isLoading = true;
    this.needsLogin = false;
    this.errorMessage = null;
    this.payments.reconcilePayment(this.sessionId).pipe(
      switchMap(response => response.paid || response.paymentStatus !== 'PENDING'
        ? of(response)
        : timer(2000, 2000).pipe(
            take(8),
            exhaustMap(() => this.payments.verifyPayment(this.sessionId)),
            startWith(response),
            takeWhile(result => !result.paid && result.paymentStatus === 'PENDING', true)
          )),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: response => {
        this.orderId = response.orderId;
        this.amount = response.amount;
        if (response.paid && !this.paymentConfirmed) {
          this.paymentConfirmed = true;
          this.idempotency.clearForOrder(response.orderDatabaseId);
          this.cart.refreshCart();
        }
      },
      error: error => {
        this.needsLogin = error instanceof HttpErrorResponse && error.status === 401;
        this.errorMessage = this.describeError(error);
      }
    });
  }

  private describeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Verification failed. Contact the store before paying again.';
    }
    if (error.status === 0) return 'The server is unavailable. Please try again later.';
    if (error.status === 401) return 'Sign in again to check your payment.';
    if (error.status === 403) return 'This account cannot verify this order. Sign in with the account used for the purchase.';
    if (error.error?.code === 'PAYMENT_NOT_FOUND') return 'The payment session could not be found. Contact the store.';
    if (error.status === 404 || error.status === 405) {
      return 'The server cannot verify this payment. Contact the store before paying again.';
    }
    if (error.error?.code === 'INCOMPLETE_STOCK_RESERVATIONS') {
      return 'The store needs to verify stock for this order.';
    }
    return `Verification failed (HTTP ${error.status}). Contact the store before paying again.`;
  }
}
