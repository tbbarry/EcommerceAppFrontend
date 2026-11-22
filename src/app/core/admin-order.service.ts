import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Order, OrderStatus } from '../models/order.model';
import { PaginatedResponse } from '../models/admin-product.model';

export interface AdminOrderSummary {
  id: number;
  orderNumber: string;
  dateOrder: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
}

export interface AdminOrderDetail {
  order: Order;
  customerEmail: string;
}

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly http = inject(HttpClient);
  private readonly url = `${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api/admin/orders`;

  list(search: string, status: string, page: number) {
    let params = new HttpParams().set('search', search).set('page', page).set('size', 10);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<AdminOrderSummary>>(this.url, { params });
  }

  detail(id: number) {
    return this.http.get<AdminOrderDetail>(`${this.url}/${id}`);
  }

  advance(id: number, expectedStatus: OrderStatus, status: OrderStatus) {
    return this.http.patch<AdminOrderDetail>(`${this.url}/${id}/status`, { expectedStatus, status });
  }
}
