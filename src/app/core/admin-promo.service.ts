import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AdminPromo {
  id: number;
  code: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type AdminPromoInput = Omit<AdminPromo, 'id'>;
export type PromoTarget = 'PRODUCT' | 'VARIANT';

export interface PromoAssignment {
  id: number;
  type: PromoTarget;
  productId: number;
  productName: string;
  variantId: number | null;
  variantSku: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminPromoService {
  private readonly url = `${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api/promos`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<AdminPromo[]>(`${this.url}/admin`);
  }

  get(id: number) {
    return this.http.get<AdminPromo>(`${this.url}/${id}`);
  }

  create(promo: AdminPromoInput) {
    return this.http.post<AdminPromo>(this.url, promo);
  }

  update(id: number, promo: AdminPromoInput) {
    return this.http.put<AdminPromo>(`${this.url}/${id}`, promo);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  assignments(id: number) {
    return this.http.get<PromoAssignment[]>(`${this.url}/${id}/assignments`);
  }

  assign(id: number, type: PromoTarget, targetId: number) {
    return this.http.post<void>(`${this.url}/${id}/assignments`, { type, targetId });
  }

  removeAssignment(id: number, assignment: PromoAssignment) {
    return this.http.delete<void>(`${this.url}/${id}/assignments/${assignment.type}/${assignment.id}`);
  }
}
