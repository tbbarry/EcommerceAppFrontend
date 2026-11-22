import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AdminAttribute,
  AdminCategory,
  AdminImageCreate,
  AdminImageUpdate,
  AdminProductUpdate,
  AdminVariantCreate,
  AdminVariantUpdate,
  PaginatedResponse,
  ProductAdminDetailResponse,
  ProductAdminListResponse,
  ProductImageDto
} from '../models/admin-product.model';

@Injectable({
  providedIn: 'root'
})
export class AdminProductService {
  private readonly baseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');
  private readonly apiUrl = `${this.baseUrl}/api/admin/products`;

  constructor(private readonly http: HttpClient) {}

  getProductsList(page = 0, size = 10): Observable<PaginatedResponse<ProductAdminListResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<PaginatedResponse<ProductAdminListResponse>>(this.apiUrl, { params });
  }

  getProductDetail(id: number): Observable<ProductAdminDetailResponse> {
    return this.http.get<ProductAdminDetailResponse>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<AdminCategory[]> {
    return this.http.get<AdminCategory[]>(`${this.baseUrl}/api/categories`);
  }

  getAttributes(): Observable<AdminAttribute[]> {
    return this.http.get<AdminAttribute[]>(`${this.baseUrl}/api/attributes/with-values`);
  }

  updateProduct(id: number, payload: AdminProductUpdate): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${id}`, payload);
  }

  createVariant(productId: number, payload: AdminVariantCreate): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${productId}/variants`, payload);
  }

  updateVariant(productId: number, variantId: number, payload: AdminVariantUpdate): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${productId}/variants/${variantId}`, payload);
  }

  updateStock(productId: number, variantId: number, quantity: number): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${productId}/variants/${variantId}/stock`, { quantity });
  }

  deleteVariant(productId: number, variantId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${productId}/variants/${variantId}`);
  }

  deleteVariants(productId: number, variantIds: number[]): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${productId}/variants/bulk-delete`, { variantIds });
  }

  createImage(productId: number, payload: AdminImageCreate): Observable<ProductImageDto> {
    const formData = new FormData();
    if (payload.file) formData.append('file', payload.file);
    else formData.append('url', payload.url);
    if (payload.alt) formData.append('alt', payload.alt);
    formData.append('main', String(payload.isMain));
    formData.append('displayOrder', String(payload.displayOrder));
    if (payload.visualAttributeValueId != null) {
      formData.append('visualAttributeValueId', String(payload.visualAttributeValueId));
    }

    return this.http.post<ProductImageDto>(`${this.apiUrl}/${productId}/images`, formData);
  }

  updateImage(productId: number, imageId: number, payload: AdminImageUpdate): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${productId}/images/${imageId}`, payload);
  }

  deleteImage(productId: number, imageId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${productId}/images/${imageId}`);
  }

  archiveProduct(productId: number): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${productId}/status`, { status: 'ARCHIVED' });
  }
}
