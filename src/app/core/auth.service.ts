import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Address {
  id?: string;
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface User {
  id?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  role?: string;
  addresses?: Address[];
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  user?: User;
}

export interface UpdateProfilePayload {
  firstname: string;
  lastname: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface UpsertAddressPayload {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
  main?: boolean;
  defaultAddress?: boolean;
}

interface AddressMutationAttempt {
  method: 'post' | 'patch' | 'put' | 'delete';
  endpoint: string;
  payload?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');
  private readonly profileEndpoints = ['/auth/profile', '/auth/me', '/api/users/me', '/users/me'];
  private readonly addressCollectionEndpoints = ['/api/user/adress/me', '/api/user/address/me'];
  private readonly changePasswordEndpoints = [
    '/api/user/change-password',
    '/api/users/change-password',
    '/users/me/change-password',
    '/auth/change-password'
  ];
  private readonly profileUpdateEndpoint = '/api/users/me';
  private readonly authTokenKey = 'ecommerce-app-token';
  private readonly userStorageKey = 'ecommerce-app-user';

  private userSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  initAuthState(): void {
    this.hydrateProfileFromApi();
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    console.log('Login credentials:', credentials);

    return this.http.post(this.buildApiUrl('/auth/login'), credentials, { responseType: 'text' }).pipe(
      map((body) => {
        console.log('Raw login response body:', body);
        const parsed = this.parseResponseBody(body);
        console.log('Parsed login response:', parsed);
        return parsed as AuthResponse;
      }),
      tap((response) => {
        this.setSession(response, credentials.email);
      }),
      switchMap((response) =>
        this.refreshProfile().pipe(
          map(() => response),
          catchError((error) => {
            console.warn('Profile hydration after login failed, continuing with token session:', error);
            return of(response);
          })
        )
      ),
      catchError((error) => {
        console.error('Login request error:', error);
        return throwError(() => error);
      })
    );
  }

  refreshProfile(): Observable<User> {
    if (!this.token) {
      return throwError(() => new Error('No auth token available'));
    }

    return this.fetchProfileFromEndpoints(this.profileEndpoints, 0).pipe(
      tap((user) => {
        const existingAddresses = this.userSubject.value?.addresses;
        const mergedUser =
          (!user.addresses || user.addresses.length === 0) && existingAddresses && existingAddresses.length > 0
            ? { ...user, addresses: existingAddresses }
            : user;

        this.userSubject.next(mergedUser);
        this.setInStorage(this.userStorageKey, JSON.stringify(mergedUser));
      })
    );
  }

  getMyAddresses(): Observable<Address[]> {
    if (!this.token) {
      return of([]);
    }

    return this.fetchAddressesFromEndpoints(this.addressCollectionEndpoints, 0).pipe(
      tap((addresses) => {
        const current = this.currentUser;
        if (!current) {
          return;
        }

        const mergedUser: User = {
          ...current,
          addresses
        };
        this.userSubject.next(mergedUser);
        this.setInStorage(this.userStorageKey, JSON.stringify(mergedUser));
      })
    );
  }

  addAddress(payload: UpsertAddressPayload): Observable<Address[]> {
    const body = this.normalizeAddressPayload(payload);
    const attempts: AddressMutationAttempt[] = this.addressCollectionEndpoints.map((endpoint) => ({
      method: 'post',
      endpoint,
      payload: body
    }));

    return this.runAddressMutationAttempts(attempts, 0);
  }

  updateAddress(addressId: string, payload: UpsertAddressPayload): Observable<Address[]> {
    const body = this.normalizeAddressPayload(payload);
    const attempts: AddressMutationAttempt[] = this.addressCollectionEndpoints.flatMap((endpoint) => [
      { method: 'patch' as const, endpoint: `${endpoint}/${addressId}`, payload: body },
      { method: 'put' as const, endpoint: `${endpoint}/${addressId}`, payload: body }
    ]);

    return this.runAddressMutationAttempts(attempts, 0);
  }

  deleteAddress(addressId: string): Observable<Address[]> {
    const attempts: AddressMutationAttempt[] = this.addressCollectionEndpoints.map((endpoint) => ({
      method: 'delete',
      endpoint: `${endpoint}/${addressId}`
    }));

    return this.runAddressMutationAttempts(attempts, 0);
  }

  setDefaultAddress(address: Address): Observable<Address[]> {
    if (!address.id) {
      return throwError(() => new Error('Address id is required to set main address'));
    }

    const payload = this.normalizeAddressPayload({
      label: address.label || 'home',
      line1: address.line1 || '',
      line2: address.line2,
      city: address.city || '',
      state: address.state,
      postalCode: address.postalCode,
      country: address.country || '',
      phone: address.phone,
      isDefault: true,
      defaultAddress: true,
      main: true
    });

    const attempts: AddressMutationAttempt[] = this.addressCollectionEndpoints.map((endpoint) => ({
      method: 'put',
      endpoint: `${endpoint}/${address.id}`,
      payload
    }));

    return this.runAddressMutationAttempts(attempts, 0);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.updateProfileFromEndpoints(this.profileUpdateEndpoint, payload).pipe(
      tap((user) => {
        this.userSubject.next(user);
        this.setInStorage(this.userStorageKey, JSON.stringify(user));
      })
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.changePasswordFromEndpoints(this.changePasswordEndpoints, 0, payload);
  }

  register(data: { firstname: string; lastname: string; email: string; password: string }): Observable<any> {
    return this.http.post(this.buildApiUrl('/auth/register'), data, { responseType: 'text' }).pipe(
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
    const url = `${this.buildApiUrl('/auth/verify')}?token=${encodeURIComponent(token)}`;

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
    return this.http.post(this.buildApiUrl('/auth/forgot-password'), { email }, { responseType: 'text' }).pipe(
      map((body) => this.parseResponseBody(body)),
      catchError((error) => {
        console.error('Forgot password request error:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(this.buildApiUrl('/auth/reset-password'), { token, newPassword: newPassword }, { responseType: 'text' }).pipe(
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

  private setSession(response: AuthResponse | Record<string, unknown>, fallbackEmail?: string): void {
    const record = response as Record<string, unknown>;
    const token = this.toText(record['token']) || this.toText(record['accessToken']);
    if (!token) {
      return;
    }

    const user = this.extractUserFromResponse(response, fallbackEmail) ?? this.userSubject.value;

    this.setInStorage(this.authTokenKey, token);
    if (user) {
      this.setInStorage(this.userStorageKey, JSON.stringify(user));
    } else {
      this.removeFromStorage(this.userStorageKey);
    }
    this.userSubject.next(user);
  }

  private extractUserFromResponse(response: AuthResponse | Record<string, unknown>, fallbackEmail?: string): User | null {
    const fromNested = this.normalizeUser((response as AuthResponse).user);
    if (fromNested) {
      return fromNested;
    }

    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return fallbackEmail ? { email: fallbackEmail } : null;
    }

    const record = response as Record<string, unknown>;
    const email = this.toText(record['email']) || fallbackEmail;
    const firstname = this.toText(record['firstname']) || this.toText(record['firstName']);
    const lastname = this.toText(record['lastname']) || this.toText(record['lastName']);
    const phone =
      this.toText(record['phone']) ||
      this.toText(record['tel']) ||
      this.toText(record['telephone']) ||
      this.toText(record['mobile']);
    const role = this.toText(record['role']);
    const id = this.toText(record['id']) || this.toText(record['userId']);
    const addresses = this.extractAddressesFromRecord(record);

    if (!email && !firstname && !lastname && !phone && !role && !id && addresses.length === 0) {
      return null;
    }

    return {
      id,
      firstname,
      lastname,
      email,
      phone,
      role,
      addresses
    };
  }

  private toText(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || undefined;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return undefined;
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

    const record = user as Record<string, unknown>;
    const normalized: User = {
      id: this.toText(record['id']) || this.toText(record['userId']),
      firstname: this.toText(record['firstname']) || this.toText(record['firstName']),
      lastname: this.toText(record['lastname']) || this.toText(record['lastName']),
      email: this.toText(record['email']),
      phone:
        this.toText(record['phone']) ||
        this.toText(record['tel']) ||
        this.toText(record['telephone']) ||
        this.toText(record['mobile']),
      role: this.toText(record['role']),
      addresses: this.extractAddressesFromRecord(record)
    };

    if (!normalized.id && !normalized.firstname && !normalized.lastname && !normalized.email && !normalized.phone && !normalized.role && (!normalized.addresses || normalized.addresses.length === 0)) {
      return null;
    }

    return normalized;
  }

  private extractAddressesFromRecord(record: Record<string, unknown>): Address[] {
    const sources = [record['addresses'], record['addressList'], record['userAddresses']];
    for (const source of sources) {
      if (Array.isArray(source)) {
        const normalized = source
          .map((item, index) => this.normalizeAddress(item, index))
          .filter((item): item is Address => !!item);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }
    return [];
  }

  private normalizeAddress(value: unknown, index: number): Address | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const normalized: Address = {
      id: this.toText(record['id']) || this.toText(record['addressId']),
      label: this.toText(record['label']) || this.toText(record['name']) || `Address ${index + 1}`,
      line1:
        this.toText(record['line1']) ||
        this.toText(record['address']) ||
        this.toText(record['addressLine1']) ||
        this.toText(record['street']) ||
        this.toText(record['street1']),
      line2: this.toText(record['line2']) || this.toText(record['addressLine2']) || this.toText(record['street2']),
      city: this.toText(record['city']) || this.toText(record['town']),
      state: this.toText(record['state']) || this.toText(record['region']) || this.toText(record['province']),
      postalCode:
        this.toText(record['postalCode']) ||
        this.toText(record['zipcode']) ||
        this.toText(record['zip']) ||
        this.toText(record['zipCode']),
      country: this.toText(record['country']),
      phone:
        this.toText(record['phone']) ||
        this.toText(record['phoneNumber']) ||
        this.toText(record['contactPhone']) ||
        this.toText(record['addressPhone']) ||
        this.toText(record['tel']) ||
        this.toText(record['telephone']) ||
        this.toText(record['mobile']),
      isDefault:
        this.toBoolean(record['isDefault']) ||
        this.toBoolean(record['default']) ||
        this.toBoolean(record['main']) ||
        this.toBoolean(record['defaultAddress'])
    };

    if (!normalized.line1 && !normalized.city && !normalized.country && !normalized.phone) {
      return null;
    }

    return normalized;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }

    return false;
  }

  private hydrateProfileFromApi(): void {
    if (!this.token) {
      return;
    }

    this.refreshProfile().subscribe({
      error: (error) => {
        console.warn('Profile hydration on app startup failed:', error);
      }
    });
  }

  private fetchProfileFromEndpoints(endpoints: string[], index: number): Observable<User> {
    if (index >= endpoints.length) {
      return throwError(() => new Error('Unable to load profile from available endpoints'));
    }

    const endpoint = endpoints[index];
    return this.http.get(this.buildApiUrl(endpoint), { responseType: 'text' }).pipe(
      map((body) => this.parseResponseBody(body)),
      map((payload) => {
        const fallbackEmail = this.userSubject.value?.email;
        const user = this.extractUserFromResponse(payload as AuthResponse | Record<string, unknown>, fallbackEmail);
        if (!user) {
          throw new Error(`Profile payload from ${endpoint} did not contain user fields`);
        }
        return user;
      }),
      catchError((error) => {
        if (index >= endpoints.length - 1) {
          return throwError(() => error);
        }
        return this.fetchProfileFromEndpoints(endpoints, index + 1);
      })
    );
  }

  private fetchAddressesFromEndpoints(endpoints: string[], index: number): Observable<Address[]> {
    if (index >= endpoints.length) {
      return throwError(() => new Error('Unable to load addresses from available endpoints'));
    }

    const endpoint = endpoints[index];
    return this.http.get(this.buildApiUrl(endpoint), { responseType: 'text' }).pipe(
      map((body) => this.extractAddressesFromPayload(this.parseArbitraryBody(body))),
      catchError((error) => {
        if (index >= endpoints.length - 1) {
          return throwError(() => error);
        }
        return this.fetchAddressesFromEndpoints(endpoints, index + 1);
      })
    );
  }

  private parseArbitraryBody(body: unknown): unknown {
    if (typeof body !== 'string') {
      return body;
    }

    const trimmed = body.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private extractAddressesFromPayload(payload: unknown): Address[] {
    if (Array.isArray(payload)) {
      return payload
        .map((item, index) => this.normalizeAddress(item, index))
        .filter((item): item is Address => !!item);
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    const direct = this.extractAddressesFromRecord(record);
    if (direct.length > 0) {
      return direct;
    }

    const nestedSources = [record['data'], record['result'], record['content'], record['items']];
    for (const source of nestedSources) {
      if (Array.isArray(source)) {
        const normalized = source
          .map((item, index) => this.normalizeAddress(item, index))
          .filter((item): item is Address => !!item);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }

    return [];
  }

  private normalizeAddressPayload(payload: UpsertAddressPayload): Record<string, unknown> {
    const isDefault = payload.isDefault || payload.main || payload.defaultAddress;

    return {
      label: payload.label,
      line1: payload.line1,
      address: payload.line1,
      line2: payload.line2,
      city: payload.city,
      state: payload.state,
      postalCode: payload.postalCode,
      zipcode: payload.postalCode,
      country: payload.country,
      phone: payload.phone,
      phoneNumber: payload.phone,
      contactPhone: payload.phone,
      addressPhone: payload.phone,
      isDefault,
      main: isDefault,
      defaultAddress: isDefault
    };
  }

  private runAddressMutationAttempts(attempts: AddressMutationAttempt[], index: number): Observable<Address[]> {
    if (index >= attempts.length) {
      return throwError(() => new Error('Unable to process address request with available endpoints'));
    }

    const attempt = attempts[index];
    return this.executeAddressMutation(attempt).pipe(
      switchMap(() =>
        this.getMyAddresses().pipe(
          catchError(() => of(this.currentUser?.addresses ?? []))
        )
      ),
      catchError((error) => {
        if (index >= attempts.length - 1) {
          return throwError(() => error);
        }
        return this.runAddressMutationAttempts(attempts, index + 1);
      })
    );
  }

  private executeAddressMutation(attempt: AddressMutationAttempt): Observable<unknown> {
    const url = this.buildApiUrl(attempt.endpoint);

    if (attempt.method === 'post') {
      return this.http.post(url, attempt.payload, { responseType: 'text' }).pipe(map((body) => this.parseArbitraryBody(body)));
    }

    if (attempt.method === 'patch') {
      return this.http.patch(url, attempt.payload, { responseType: 'text' }).pipe(map((body) => this.parseArbitraryBody(body)));
    }

    if (attempt.method === 'put') {
      return this.http.put(url, attempt.payload, { responseType: 'text' }).pipe(map((body) => this.parseArbitraryBody(body)));
    }

    return this.http.delete(url, { responseType: 'text' }).pipe(map((body) => this.parseArbitraryBody(body)));
  }

  private updateProfileFromEndpoints(endpoint: string, payload: UpdateProfilePayload): Observable<User> {
 
    return this.http.patch(this.buildApiUrl(endpoint), payload, { responseType: 'text' }).pipe(
      map((body) => this.parseResponseBody(body)),
      map((response) => {
        const mergedUser = {
          ...this.currentUser,
          ...payload
        } as User;
        return this.extractUserFromResponse(response as AuthResponse | Record<string, unknown>, mergedUser.email) ?? mergedUser;
      })
    );
  }

  private changePasswordFromEndpoints(endpoints: string[], index: number, payload: ChangePasswordPayload): Observable<void> {
    if (index >= endpoints.length) {
      return throwError(() => new Error('Unable to change password from available endpoints'));
    }

    const endpoint = endpoints[index];
    return this.http.put(this.buildApiUrl(endpoint), payload, { responseType: 'text' }).pipe(
      map(() => void 0),
      catchError((error) => {
        const status = error?.status ?? 0;
        if (status === 404 || status === 405) {
          return this.changePasswordFromEndpoints(endpoints, index + 1, payload);
        }
        if (index >= endpoints.length - 1) {
          return throwError(() => new Error(this.extractHttpErrorMessage(error)));
        }
        return this.changePasswordFromEndpoints(endpoints, index + 1, payload);
      })
    );
  }

  private getFromStorage(key: string): string | null {
    if (!this.isBrowserStorageAvailable()) {
      return null;
    }
    return globalThis.localStorage.getItem(key);
  }

  private buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalizedPath}`;
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
