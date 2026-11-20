import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Order } from '../models/order.model';

export interface PaymentConfirmationResponse {
  orderId: number;
  paymentIntentId: string;
  amount: number;
  status: string;
  paid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private readonly http = inject(HttpClient);

  private readonly apiBase =
    (environment.apiBaseUrl || '').replace(/\/$/, '');

  private  baseUrl = (environment as { apiBaseUrl?: string }).apiBaseUrl || '';

  verifyPayment(sessionId: string) {

    return this.http.get<PaymentConfirmationResponse>(
      `${this.baseUrl}/api/payments/checkout-session/${sessionId}`,
    );
  }
  getMyOrders() {
    return this.http.get<Order[]>(`${this.baseUrl}/api/orders/me`);
  }
}