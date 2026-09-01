import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { CatalogResponse } from '../models/catalogResponse.model';

export interface CatalogSearchParams {
  page?: number;
  size?: number;
  query?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  categoryId?: number | null;
  facets?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    (environment.apiBaseUrl || '').replace(/\/$/, '');

  getCatalog(params: CatalogSearchParams = {}) {

    let httpParams = new HttpParams();

    if (params.page != null) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.size != null) {
      httpParams = httpParams.set('size', params.size);
    }

    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }

    if (params.minPrice != null) {
      httpParams = httpParams.set('minPrice', params.minPrice);
    }

    if (params.maxPrice != null) {
      httpParams = httpParams.set('maxPrice', params.maxPrice);
    }

    if (params.categoryId != null) {
      httpParams = httpParams.set('categoryId', params.categoryId);
    }

    if (params.facets) {
      httpParams = httpParams.set('facets', params.facets);
    }
    console.log(httpParams);

    return this.http.get<CatalogResponse>(
      `${this.baseUrl}/api/catalog/products`,
      { params: httpParams }
    );
  }
}