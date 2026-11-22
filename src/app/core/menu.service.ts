import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Category {
  id: number;
  name: string;
  children: Category[];
  description?: string;
  displayOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private readonly http = inject(HttpClient);
  private readonly changes = new Subject<void>();
  readonly changes$ = this.changes.asObservable();

  private readonly baseUrl =
    (environment.apiBaseUrl || '').replace(/\/$/, '');

  getMenu() {
    return this.http.get<Category[]>(
      `${this.baseUrl}/api/categories`
    );
  }

  refresh(): void {
    this.changes.next();
  }
}