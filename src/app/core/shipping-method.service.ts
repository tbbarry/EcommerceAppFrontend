import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export type ShippingDeliveryType = 'HOME' | 'HAND_TO_HAND' | 'LOCKER' | 'PICKUP_POINT';

export interface ShippingMethod {
  id: number;
  name: string;
  code: string;
  deliveryType: ShippingDeliveryType;
  description: string | null;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  price: number;
  freeShippingThreshold: number | null;
  active: boolean;
}

export type ShippingMethodInput = Omit<ShippingMethod, 'id'>;

@Injectable({ providedIn: 'root' })
export class ShippingMethodService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = (environment.apiBaseUrl || '').replace(/\/$/, '');
  private readonly adminUrl = `${this.apiBase}/api/admin/shipping-methods`;

  list() { return this.http.get<ShippingMethod[]>(this.adminUrl); }
  create(method: ShippingMethodInput) { return this.http.post<ShippingMethod>(this.adminUrl, method); }
  update(id: number, method: ShippingMethodInput) { return this.http.put<ShippingMethod>(`${this.adminUrl}/${id}`, method); }
}
