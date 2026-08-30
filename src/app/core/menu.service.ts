import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

export interface Category {
  id: number;
  name: string;
  children: Category[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    (environment.apiBaseUrl || '').replace(/\/$/, '');

  getMenu() {
    return this.http.get<Category[]>(
      `${this.baseUrl}/api/categories`
    );
  }
}