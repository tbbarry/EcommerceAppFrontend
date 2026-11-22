import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

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
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe],
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.css']
})
export class OrderConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  order: CheckoutResponse | null = null;
  orderId: string | null = null;

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId');

    const raw = sessionStorage.getItem('last-order-confirmation');
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CheckoutResponse;
      if (!this.orderId || String(parsed.orderId) === this.orderId) {
        this.order = parsed;
      }
    } catch {
      this.order = null;
    }
  }
}
