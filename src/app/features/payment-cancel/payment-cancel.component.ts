import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="container py-5">
      <section class="card border-0 shadow-sm mx-auto" style="max-width: 36rem">
        <div class="card-body p-4 p-md-5 text-center">
          <h1 class="h3">Payment not completed</h1>
          <p>You left the payment page. If payment was not confirmed, your cart is still available.</p>
          <p>If you've already paid, check your order status before trying again.</p>
          <div class="d-flex flex-column flex-sm-row justify-content-center gap-2">
            <a routerLink="/my-orders" class="btn btn-dark">View my orders</a>
            <a routerLink="/cart" class="btn btn-outline-dark">Return to cart</a>
          </div>
        </div>
      </section>
    </main>
  `
})
export class PaymentCancelComponent {}
