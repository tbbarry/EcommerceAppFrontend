import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { PaginatedResponse } from '../models/admin-product.model';

export interface Review {
  id: number;
  productName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  visible: boolean;
}

export interface ReviewSummary {
  count: number;
  average: number;
  distribution: Record<string, number>;
  reviews: PaginatedResponse<Review>;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly api = `${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api`;

  publicReviews(productId: number, page: number) {
    return this.http.get<ReviewSummary>(`${this.api}/products/${productId}/reviews`, {
      params: new HttpParams().set('page', page)
    });
  }

  mine(itemId: number) {
    return this.http.get<Review | null>(`${this.api}/reviews/order-items/${itemId}`);
  }

  save(itemId: number, rating: number, comment: string) {
    return this.http.put<Review>(`${this.api}/reviews/order-items/${itemId}`, { rating, comment });
  }

  delete(itemId: number) {
    return this.http.delete<void>(`${this.api}/reviews/order-items/${itemId}`);
  }

  admin(page: number) {
    return this.http.get<PaginatedResponse<Review>>(`${this.api}/admin/reviews`, {
      params: new HttpParams().set('page', page)
    });
  }

  setVisibility(id: number, visible: boolean) {
    return this.http.patch<Review>(`${this.api}/admin/reviews/${id}/visibility`, { visible });
  }
}
