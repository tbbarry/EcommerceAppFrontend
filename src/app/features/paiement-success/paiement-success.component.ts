import { CommonModule } from '@angular/common';
import { Subscription, interval, of } from 'rxjs';
import { switchMap, catchError, takeWhile } from 'rxjs/operators';
import { PaymentConfirmationResponse } from '../../core/payment.service';



import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PaymentService } from '../../core/payment.service';
import { CartService } from '../../core/cart.service';
import { CheckoutIdempotencyService } from '../../core/checkout-idempotency-service';
import { Router } from 'express';

@Component({
  selector: 'app-paiement-success',
  imports: [CommonModule, RouterModule],
  templateUrl: './paiement-success.component.html',
  styleUrls: ['./paiement-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly paymentService = inject(PaymentService);
  private readonly checkoutIdempotencyService = inject(CheckoutIdempotencyService);
  private readonly cartService = inject(CartService);
  isLoading = true;

  paymentConfirmed = false;

  errorMessage: string | null = null;

  orderId: number | null = null;

  amount: number | null = null;


  ngOnInit(): void {

    const sessionId =
      this.route.snapshot.queryParamMap.get('session_id');
      console.log('Session ID:', sessionId);


    if (!sessionId) {

      this.isLoading = false;

      this.errorMessage =
        'Session de paiement introuvable.';

      return;
    }


    this.paymentService
      .verifyPayment(sessionId)
      .subscribe({

        next: (response) => {

          this.orderId = response.orderId;

          this.amount = response.amount;

          this.paymentConfirmed = response.paid;

          this.isLoading = false;

          //clear idempotency key after successful payment verification
          this.checkoutIdempotencyService.clear();
          //clear cart after successful payment verification
          
          this.cartService.clearCartFromStorage();


        },

        error: (e) => {
          console.log(e)
          this.isLoading = false;

          this.errorMessage =
            'Le paiement est encore en cours de vérification. Veuillez patienter.';
        }
      });
  }
}