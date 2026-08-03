import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: string;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');
  private readonly authTokenKey = 'ecommerce-app-token';
  private readonly userStorageKey = 'ecommerce-app-user';

  private userSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    console.log('Login credentials:', credentials);

    return this.http.post(`${this.apiUrl}/auth/login`, credentials, { responseType: 'text' }).pipe(
      map((body) => {
        console.log('Raw login response body:', body);
        const parsed = this.parseResponseBody(body);
        console.log('Parsed login response:', parsed);
        return parsed as AuthResponse;
      }),
      tap((response) => {
        this.setSession(response);
      }),
      catchError((error) => {
        console.error('Login request error:', error);
        return throwError(() => error);
      })
    );
  }

  register(data: { firstname: string; lastname: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data, { responseType: 'text' }).pipe(
      map((body) => {
        console.log('Raw register response body:', body);
        const parsed = this.parseResponseBody(body);
        console.log('Parsed register response:', parsed);
        return parsed;
      }),
      catchError((error) => {
        console.error('Register request error:', error);
        return throwError(() => error);
      })
    );
  }

  verifyAccount(token: string): Observable<any> {
    const url = `${this.apiUrl}/auth/verify?token=${encodeURIComponent(token)}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map((body) => {
        console.log('Raw verify response body:', body);
        return this.parseResponseBody(body);
      }),
      catchError((error) => {
        console.error('Verify request error:', error);
        return throwError(() => error);
      })
    );
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email }, { responseType: 'text' }).pipe(
      map((body) => this.parseResponseBody(body)),
      catchError((error) => {
        console.error('Forgot password request error:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { token, newPassword: newPassword }, { responseType: 'text' }).pipe(
      map((body) => this.parseResponseBody(body)),
      catchError((error) => {
        console.error('Reset password request error:', this.extractHttpErrorMessage(error), error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.removeFromStorage(this.authTokenKey);
    this.removeFromStorage(this.userStorageKey);
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  get token(): string | null {
    return this.getFromStorage(this.authTokenKey);
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  private parseResponseBody(body: unknown): AuthResponse | Record<string, unknown> {
    if (!body) {
      return {};
    }

    if (typeof body === 'object') {
      return body as AuthResponse;
    }

    if (typeof body === 'string') {
      const trimmed = body.trim();
      if (!trimmed) {
        return {};
      }

      try {
        return JSON.parse(trimmed) as AuthResponse;
      } catch {
        return { token: trimmed };
      }
    }

    return { token: String(body) };
  }

  private extractHttpErrorMessage(error: any): string {
    const fallback = 'Unknown error';
    const payload = this.normalizeErrorPayload(error?.error);

    const details = this.pickErrorMessage(payload?.errors) || this.pickErrorMessage(payload?.details);
    if (details) {
      return details;
    }

    const message = this.pickErrorMessage(payload?.message);
    if (message && !/^validation\s*error$/i.test(message)) {
      return message;
    }

    return this.pickErrorMessage(payload?.error) || this.pickErrorMessage(error?.message) || fallback;
  }

  private normalizeErrorPayload(payload: unknown): any {
    if (typeof payload !== 'string') {
      return payload;
    }

    const trimmed = payload.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private pickErrorMessage(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const message = this.pickErrorMessage(item);
        if (message) {
          return message;
        }
      }
      return '';
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;

      const prioritizedKeys = ['constraints', 'messages', 'message', 'details', 'detail', 'violations', 'error'];
      for (const key of prioritizedKeys) {
        const message = this.pickErrorMessage(record[key]);
        if (message) {
          return message;
        }
      }

      const ignoredKeys = new Set(['property', 'field', 'path', 'param', 'target', 'children', 'value']);
      for (const [key, nestedValue] of Object.entries(record)) {
        if (ignoredKeys.has(key)) {
          continue;
        }

        const message = this.pickErrorMessage(nestedValue);
        if (message) {
          return message;
        }
      }
    }

    return '';
  }

  private setSession(response: AuthResponse): void {
    const token = response.token ?? response.accessToken;
    if (!token) {
      return;
    }

    const user = this.normalizeUser(response.user);

    this.setInStorage(this.authTokenKey, token);
    if (user) {
      this.setInStorage(this.userStorageKey, JSON.stringify(user));
    } else {
      this.removeFromStorage(this.userStorageKey);
    }
    this.userSubject.next(user);
  }

  private getSavedUser(): User | null {
    const value = this.getFromStorage(this.userStorageKey);
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      return this.normalizeUser(parsed);
    } catch (error) {
      console.warn('Invalid saved user data, clearing storage:', error);
      this.removeFromStorage(this.userStorageKey);
      return null;
    }
  }

  private isBrowserStorageAvailable(): boolean {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
  }

  private normalizeUser(user: unknown): User | null {
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      return null;
    }

    return user as User;
  }

  private getFromStorage(key: string): string | null {
    if (!this.isBrowserStorageAvailable()) {
      return null;
    }
    return globalThis.localStorage.getItem(key);
  }

  private setInStorage(key: string, value: string): void {
    if (!this.isBrowserStorageAvailable()) {
      return;
    }
    globalThis.localStorage.setItem(key, value);
  }

  private removeFromStorage(key: string): void {
    if (!this.isBrowserStorageAvailable()) {
      return;
    }
    globalThis.localStorage.removeItem(key);
  }
}
