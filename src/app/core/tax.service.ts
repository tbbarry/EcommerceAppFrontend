import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = (environment.apiBaseUrl || '').replace(/\/$/, '');

  private readonly _currentRate = signal(0);
  readonly currentRate = this._currentRate.asReadonly();

  readonly isLoading = signal(false);

  loadCurrentTaxRate() {
    this.isLoading.set(true);

    return this.http
      .get(`${this.apiBase}/api/tax-settings/current`, { responseType: 'text' })
      .pipe(
        map((raw) => this.parseRate(raw)),
        tap((rate) => this._currentRate.set(rate)),
        catchError(() => of(this._currentRate())),
        finalize(() => this.isLoading.set(false))
      );
  }

  private parseRate(raw: unknown): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) {
        return 0;
      }

      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }

      try {
        const record = JSON.parse(trimmed) as Record<string, unknown>;
        return this.parseRate(record);
      } catch {
        return 0;
      }
    }

    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>;
      const candidates = ['rate', 'taxRate', 'currentRate', 'value'];
      for (const key of candidates) {
        const value = record[key];
        const parsed = this.parseRate(value);
        if (parsed > 0) {
          return parsed;
        }
      }
    }

    return 0;
  }
}
