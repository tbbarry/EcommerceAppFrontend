import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id?: string;
  name?: string;
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
  private readonly apiUrl = environment.apiBaseUrl;
  private readonly authTokenKey = 'ecommerce-app-token';
  private readonly userStorageKey = 'ecommerce-app-user';

  private userSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(tap((response) => this.setSession(response)));
  }

  register(data: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
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

  private setSession(response: AuthResponse): void {
    const token = response.token ?? response.accessToken;
    if (!token) {
      return;
    }

    this.setInStorage(this.authTokenKey, token);
    this.setInStorage(this.userStorageKey, JSON.stringify(response.user ?? {}));
    this.userSubject.next(response.user ?? null);
  }

  private getSavedUser(): User | null {
    const value = this.getFromStorage(this.userStorageKey);
    return value ? JSON.parse(value) : null;
  }

  private isBrowserStorageAvailable(): boolean {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
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
