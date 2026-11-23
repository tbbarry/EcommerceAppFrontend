import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Category } from './menu.service';
import { AdminAttribute } from '../models/admin-product.model';

export interface CategoryInput {
  name: string;
  description: string;
  categoryId: number | null;
  displayOrder: number;
}

@Injectable({ providedIn: 'root' })
export class AdminTaxonomyService {
  private readonly http = inject(HttpClient);
  private readonly base = (environment.apiBaseUrl || '').replace(/\/$/, '');

  categories() { return this.http.get<Category[]>(`${this.base}/api/categories`); }
  attributes() { return this.http.get<AdminAttribute[]>(`${this.base}/api/attributes/with-values`); }
  createCategory(input: CategoryInput) { return this.http.post(`${this.base}/api/categories`, input); }
  updateCategory(id: number, input: CategoryInput) { return this.http.put(`${this.base}/api/categories/${id}`, input); }
  deleteCategory(id: number) { return this.http.delete(`${this.base}/api/categories/${id}`); }
  createAttribute(name: string) { return this.http.post(`${this.base}/api/attributes`, { name }); }
  updateAttribute(id: number, name: string) { return this.http.put(`${this.base}/api/attributes/${id}`, { name }); }
  deleteAttribute(id: number) { return this.http.delete(`${this.base}/api/attributes/${id}`); }
  createValue(attributeId: number, value: string) { return this.http.post(`${this.base}/api/attribute-values`, { attributeId, value }); }
  updateValue(id: number, attributeId: number, value: string) { return this.http.put(`${this.base}/api/attribute-values/${id}`, { attributeId, value }); }
  deleteValue(id: number) { return this.http.delete(`${this.base}/api/attribute-values/${id}`); }
}
