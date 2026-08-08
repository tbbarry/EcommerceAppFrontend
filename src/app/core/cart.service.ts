import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface CartItem {
  cartItemId?: number;
  variantId?: number;
  productId: number;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  imageAlt: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  maxStock: number;
}

interface BackendCartItem {
  cartItemId: number;
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  color: string | null;
  size: string | null;
  quantity: number;
  availableStock: number;
  inStock: boolean;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  imageAlt: string | null;
}

interface BackendCartResponse {
  cartId: number;
  userId: number;
  items: BackendCartItem[];
  totalItems: number;
  subtotal: number;
  empty: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'niceshop_cart_v1';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiBase = (environment.apiBaseUrl || '').replace(/\/$/, '');

  private readonly _items = signal<CartItem[]>(this.loadFromStorage());
  private readonly _backendSubtotal = signal<number | null>(null);
  private readonly _backendTotalItems = signal<number | null>(null);

  readonly isLoadingCart = signal(false);
  readonly cartError = signal<string | null>(null);

  private readonly _currentUser = toSignal(this.authService.user$, {
    initialValue: this.authService.currentUser
  });
  private readonly _isAuthenticated = computed(() => !!this._currentUser());
  private _prevAuthState: boolean | null = null;

  readonly cartItems = this._items.asReadonly();

  readonly totalQuantity = computed(() => {
    const backendTotal = this._backendTotalItems();
    if (backendTotal !== null && this._isAuthenticated()) {
      return backendTotal;
    }
    return this._items().reduce((sum, item) => sum + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    const backendSub = this._backendSubtotal();
    if (backendSub !== null && this._isAuthenticated()) {
      return backendSub;
    }
    return this._items().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  readonly isEmpty = computed(() => this._items().length === 0);

  constructor() {
    effect(() => {
      if (!this._isAuthenticated()) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
        } catch { }
      }
    });

    effect(() => {
      const isAuth = this._isAuthenticated();
      if (this._prevAuthState === null) {
        if (isAuth) {
          this.syncAndLoadBackendCart();
        }
      } else if (isAuth && !this._prevAuthState) {
        this.syncAndLoadBackendCart();
      } else if (!isAuth && this._prevAuthState) {
        this._backendSubtotal.set(null);
        this._backendTotalItems.set(null);
        this._items.set(this.loadFromStorage());
      }
      this._prevAuthState = isAuth;
    });
  }

  addItem(payload: Omit<CartItem, 'quantity' | 'cartItemId'> & { quantity?: number }): Observable<boolean> {
    if (this._isAuthenticated()) {
      if (!payload.variantId) {
        this.cartError.set('Impossible d\'ajouter au panier : variante non identifiee.');
        return of(false);
      }
      this.isLoadingCart.set(true);
      this.cartError.set(null);
      return this.http.post<BackendCartResponse>(
        `${this.apiBase}/api/carts/me/items`,
        { variantId: payload.variantId, quantity: payload.quantity ?? 1 }
      ).pipe(
        tap((r) => this.applyBackendResponse(r)),
        map(() => true),
        catchError((err) => {
          this.cartError.set(this.extractError(err));
          return of(false);
        }),
        finalize(() => this.isLoadingCart.set(false))
      );
    } else {
      const current = this._items();
      const key = this.itemKey(payload);
      const idx = current.findIndex((i) => this.itemKey(i) === key);
      const qty = payload.quantity ?? 1;
      if (idx >= 0) {
        const existing = current[idx];
        this._items.update((list) =>
          list.map((item, i) =>
            i === idx ? { ...existing, quantity: Math.min(existing.quantity + qty, existing.maxStock) } : item
          )
        );
      } else {
        this._items.update((list) => [...list, { ...payload, quantity: qty }]);
      }

      return of(true);
    }
  }

  setQuantity(item: CartItem, quantity: number): void {
    if (this._isAuthenticated()) {
      if (!item.cartItemId) return;
      this.isLoadingCart.set(true);
      this.cartError.set(null);
      if (quantity <= 0) {
        this.http.delete<BackendCartResponse>(`${this.apiBase}/api/carts/me/items/${item.cartItemId}`)
          .pipe(
            tap((r) => this.applyBackendResponse(r)),
            catchError((err) => { this.cartError.set(this.extractError(err)); return of(null); })
          ).subscribe(() => this.isLoadingCart.set(false));
      } else {
        this.http.put<BackendCartResponse>(
          `${this.apiBase}/api/carts/me/items/${item.cartItemId}`,
          { quantity }
        ).pipe(
          tap((r) => this.applyBackendResponse(r)),
          catchError((err) => { this.cartError.set(this.extractError(err)); return of(null); })
        ).subscribe(() => this.isLoadingCart.set(false));
      }
    } else {
      const key = this.itemKey(item);
      if (quantity <= 0) {
        this._items.update((list) => list.filter((i) => this.itemKey(i) !== key));
      } else {
        this._items.update((list) =>
          list.map((i) =>
            this.itemKey(i) === key
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
              : i
          )
        );
      }
    }
  }

  removeItem(item: CartItem): void {
    if (this._isAuthenticated()) {
      if (!item.cartItemId) return;
      this.isLoadingCart.set(true);
      this.cartError.set(null);
      this.http.delete<BackendCartResponse>(`${this.apiBase}/api/carts/me/items/${item.cartItemId}`)
        .pipe(
          tap((r) => this.applyBackendResponse(r)),
          catchError((err) => { this.cartError.set(this.extractError(err)); return of(null); })
        ).subscribe(() => this.isLoadingCart.set(false));
    } else {
      const key = this.itemKey(item);
      this._items.update((list) => list.filter((i) => this.itemKey(i) !== key));
    }
  }

  clearCart(): void {
    if (this._isAuthenticated()) {
      this.isLoadingCart.set(true);
      this.cartError.set(null);
      this.http.delete<BackendCartResponse>(`${this.apiBase}/api/carts/me`)
        .pipe(
          tap((r) => this.applyBackendResponse(r)),
          catchError((err) => { this.cartError.set(this.extractError(err)); return of(null); })
        ).subscribe(() => this.isLoadingCart.set(false));
    } else {
      this._items.set([]);
    }
  }

  itemKey(item: Pick<CartItem, 'productId' | 'color' | 'size'>): string {
    return `${item.productId}|${item.color ?? ''}|${item.size ?? ''}`;
  }

  private syncAndLoadBackendCart(): void {
    const guestItems = this.loadFromStorage();
    const syncable = guestItems.filter((i) => !!i.variantId);

    if (!syncable.length) {
      this.loadBackendCart();
      return;
    }

    this.isLoadingCart.set(true);
    const syncPayload = {
      items: syncable.map((i) => ({ variantId: i.variantId!, quantity: i.quantity })),
      replaceExisting: false
    };

    this.http.post<BackendCartResponse>(`${this.apiBase}/api/carts/me/sync`, syncPayload)
      .pipe(
        tap((r) => {
          this.applyBackendResponse(r);
          try { localStorage.removeItem(STORAGE_KEY); } catch { }
        }),
        catchError(() =>
          this.http.get<BackendCartResponse>(`${this.apiBase}/api/carts/me`).pipe(
            tap((r) => this.applyBackendResponse(r)),
            catchError(() => of(null))
          )
        )
      ).subscribe(() => this.isLoadingCart.set(false));
  }

  private loadBackendCart(): void {
    this.isLoadingCart.set(true);
    this.http.get<BackendCartResponse>(`${this.apiBase}/api/carts/me`)
      .pipe(
        tap((r) => this.applyBackendResponse(r)),
        catchError(() => of(null))
      ).subscribe(() => this.isLoadingCart.set(false));
  }

  private applyBackendResponse(response: BackendCartResponse | null): void {
    if (!response) return;
    const mapped: CartItem[] = response.items.map((item) => ({
      cartItemId: item.cartItemId,
      variantId: item.variantId,
      productId: item.productId,
      slug: item.productSlug,
      name: item.productName,
      price: item.unitPrice,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      maxStock: item.availableStock
    }));
    this._items.set(mapped);
    this._backendSubtotal.set(response.subtotal);
    this._backendTotalItems.set(response.totalItems);
  }

  private extractError(err: unknown): string {
    const body = (err as { error?: unknown })?.error;
    if (!body) return 'Erreur reseau. Veuillez reessayer.';
    if (typeof body === 'string') {
      try { return (JSON.parse(body) as { message?: string })?.message ?? body; } catch { return body; }
    }
    const obj = body as { message?: string; error?: string };
    return obj.message || obj.error || 'Erreur serveur.';
  }

  private loadFromStorage(): CartItem[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
