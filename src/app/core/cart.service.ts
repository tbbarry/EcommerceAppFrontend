import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  tap
} from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';


// ============================================================
// CART ITEM — MODÈLE UTILISÉ PAR ANGULAR
// ============================================================

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

  /**
   * Stock disponible au moment où le panier
   * a été récupéré depuis le backend.
   *
   * Attention :
   * cette valeur est informative.
   * Le backend reste l'autorité finale sur le stock.
   */
  maxStock: number;
}


// ============================================================
// RÉPONSE D'UNE LIGNE DE PANIER DU BACKEND
// ============================================================

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


// ============================================================
// RÉPONSE DU PANIER
// ============================================================

interface BackendCartResponse {
  cartId: number;
  userId: number;

  items: BackendCartItem[];

  totalItems: number;
  subtotal: number;

  empty: boolean;

  updatedAt: string;
}


// ============================================================
// ERREUR BACKEND
// ============================================================
//
// Correspond à ton ErrorResponse Java.
//
// Exemple :
//
// {
//   "timestamp": "...",
//   "status": 400,
//   "error": "Bad Request",
//   "code": "INSUFFICIENT_STOCK",
//   "message": "Insufficient stock. Available: 7, requested: 32",
//   "errors": null
// }
//

interface BackendErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;

  /**
   * Code métier envoyé par le backend.
   */
  code?: string;

  /**
   * Message technique du backend.
   */
  message?: string;

  errors?: unknown;
}


// ============================================================
// STOCKAGE LOCAL
// ============================================================

const STORAGE_KEY = 'niceshop_cart_v1';


// ============================================================
// SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class CartService {

  // ----------------------------------------------------------
  // DEPENDENCIES
  // ----------------------------------------------------------

  private readonly http = inject(HttpClient);

  private readonly authService = inject(AuthService);

  private readonly apiBase =
    (environment.apiBaseUrl || '').replace(/\/$/, '');


  // ----------------------------------------------------------
  // ÉTAT LOCAL DU PANIER
  // ----------------------------------------------------------

  private readonly _items =
    signal<CartItem[]>(this.loadFromStorage());


  private readonly _backendSubtotal =
    signal<number | null>(null);


  private readonly _backendTotalItems =
    signal<number | null>(null);


  // ----------------------------------------------------------
  // ÉTAT UI
  // ----------------------------------------------------------

  readonly isLoadingCart =
    signal(false);


  /**
   * Message destiné directement à l'utilisateur.
   *
   * Il ne contient pas le message technique du backend.
   */
  readonly cartError =
    signal<string | null>(null);


  // ----------------------------------------------------------
  // AUTHENTIFICATION
  // ----------------------------------------------------------

  private readonly _currentUser =
    toSignal(this.authService.user$, {
      initialValue: this.authService.currentUser
    });


  private readonly _isAuthenticated =
    computed(() => !!this._currentUser());


  private _prevAuthState: boolean | null = null;


  // ----------------------------------------------------------
  // PUBLIC SIGNALS
  // ----------------------------------------------------------

  readonly cartItems =
    this._items.asReadonly();


  readonly totalQuantity =
    computed(() => {

      const backendTotal =
        this._backendTotalItems();

      if (
        backendTotal !== null &&
        this._isAuthenticated()
      ) {
        return backendTotal;
      }

      return this._items()
        .reduce(
          (sum, item) =>
            sum + item.quantity,
          0
        );
    });


  readonly subtotal =
    computed(() => {

      const backendSubtotal =
        this._backendSubtotal();

      if (
        backendSubtotal !== null &&
        this._isAuthenticated()
      ) {
        return backendSubtotal;
      }

      return this._items()
        .reduce(
          (sum, item) =>
            sum + item.price * item.quantity,
          0
        );
    });


  readonly isEmpty =
    computed(() =>
      this._items().length === 0
    );


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor() {

    // --------------------------------------------------------
    // SAUVEGARDE DU PANIER INVITÉ
    // --------------------------------------------------------

    effect(() => {

      if (!this._isAuthenticated()) {

        try {

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(this._items())
          );

        } catch {
          // localStorage indisponible :
          // on ne bloque pas l'application.
        }
      }
    });


    // --------------------------------------------------------
    // SYNCHRONISATION AUTHENTIFICATION
    // --------------------------------------------------------

    effect(() => {

      const isAuth =
        this._isAuthenticated();


      // Premier état connu
      if (this._prevAuthState === null) {

        if (isAuth) {
          this.syncAndLoadBackendCart();
        }

      }

      // Connexion
      else if (
        isAuth &&
        !this._prevAuthState
      ) {

        this.syncAndLoadBackendCart();

      }

      // Déconnexion
      else if (
        !isAuth &&
        this._prevAuthState
      ) {

        this._backendSubtotal.set(null);

        this._backendTotalItems.set(null);

        this._items.set(
          this.loadFromStorage()
        );
      }


      this._prevAuthState =
        isAuth;
    });
  }


  // ==========================================================
  // AJOUTER UN ARTICLE
  // ==========================================================

  addItem(
    payload: Omit<CartItem, 'quantity' | 'cartItemId'>
      & { quantity?: number }
  ): Observable<boolean> {

    // --------------------------------------------------------
    // UTILISATEUR AUTHENTIFIÉ
    // --------------------------------------------------------

    if (this._isAuthenticated()) {

      if (!payload.variantId) {

        this.cartError.set(
          'Impossible d’ajouter cet article au panier : la variante du produit est introuvable.'
        );

        return of(false);
      }


      this.isLoadingCart.set(true);

      this.cartError.set(null);


      return this.http
        .post<BackendCartResponse>(
          `${this.apiBase}/api/carts/me/items`,
          {
            variantId: payload.variantId,
            quantity: payload.quantity ?? 1
          }
        )
        .pipe(

          tap((response) => {

            this.applyBackendResponse(
              response
            );
          }),

          map(() => true),

          catchError((error) => {

            console.error(
              'Cart add item error:',
              error
            );

            this.cartError.set(
              this.extractError(error)
            );

            return of(false);
          }),

          finalize(() =>
            this.isLoadingCart.set(false)
          )
        );
    }


    // --------------------------------------------------------
    // UTILISATEUR INVITÉ
    // --------------------------------------------------------

    const current =
      this._items();


    const key =
      this.itemKey(payload);


    const index =
      current.findIndex(
        item =>
          this.itemKey(item) === key
      );


    const quantity =
      payload.quantity ?? 1;


    if (index >= 0) {

      const existing =
        current[index];


      const requestedQuantity =
        existing.quantity + quantity;


      const newQuantity =
        Math.min(
          requestedQuantity,
          existing.maxStock
        );


      this._items.update(
        list =>
          list.map(
            (item, i) =>
              i === index
                ? {
                    ...existing,
                    quantity: newQuantity
                  }
                : item
          )
      );


      // ------------------------------------------------------
      // INFORMATION UTILISATEUR
      // ------------------------------------------------------
      //
      // Le panier invité n'interroge pas le backend.
      // Si la quantité locale dépasse le stock connu,
      // on informe simplement l'utilisateur.
      //

      if (
        requestedQuantity >
        existing.maxStock
      ) {

        this.cartError.set(
          `Il ne reste que ${existing.maxStock} exemplaire${
            existing.maxStock > 1 ? 's' : ''
          } disponible${
            existing.maxStock > 1 ? 's' : ''
          } pour cet article.`
        );

      } else {

        this.cartError.set(null);
      }

    } else {

      const safeQuantity =
        Math.min(
          quantity,
          payload.maxStock
        );


      this._items.update(
        list => [
          ...list,
          {
            ...payload,
            quantity: safeQuantity
          }
        ]
      );


      if (quantity >payload.maxStock) {

        this.cartError.set(
          `Il ne reste que ${payload.maxStock} exemplaire${
            payload.maxStock > 1 ? 's' : ''
          } disponible${
            payload.maxStock > 1 ? 's' : ''
          } pour cet article.`
        );

      } else {

        this.cartError.set(null);
      }
    }


    return of(true);
  }


  // ==========================================================
  // MODIFIER LA QUANTITÉ
  // ==========================================================

  setQuantity(
    item: CartItem,
    quantity: number
  ): void {

    // --------------------------------------------------------
    // UTILISATEUR AUTHENTIFIÉ
    // --------------------------------------------------------

    if (this._isAuthenticated()) {

      if (!item.cartItemId) {
        return;
      }


      this.isLoadingCart.set(true);

      this.cartError.set(null);


      // ------------------------------------------------------
      // SUPPRESSION
      // ------------------------------------------------------

      if (quantity <= 0) {

        this.http
          .delete<BackendCartResponse>(
            `${this.apiBase}/api/carts/me/items/${item.cartItemId}`
          )
          .pipe(

            tap((response) => {

              this.applyBackendResponse(
                response
              );
            }),

            catchError((error) => {

              console.error(
                'Cart delete item error:',
                error
              );

              this.cartError.set(
                this.extractError(error)
              );

              return of(null);
            }),

            finalize(() =>
              this.isLoadingCart.set(false)
            )

          )
          .subscribe();

        return;
      }


      // ------------------------------------------------------
      // MODIFICATION
      // ------------------------------------------------------

      this.http
        .put<BackendCartResponse>(
          `${this.apiBase}/api/carts/me/items/${item.cartItemId}`,
          {
            quantity
          }
        )
        .pipe(

          tap((response) => {

            this.applyBackendResponse(
              response
            );
          }),

          catchError((error) => {

            console.error(
              'Cart update quantity error:',
              error
            );

            this.cartError.set(
              this.extractError(error)
            );

            return of(null);
          }),

          finalize(() =>
            this.isLoadingCart.set(false)
          )

        )
        .subscribe();

      return;
    }


    // --------------------------------------------------------
    // UTILISATEUR INVITÉ
    // --------------------------------------------------------

    const key =
      this.itemKey(item);


    if (quantity <= 0) {

      this._items.update(
        list =>
          list.filter(
            current =>
              this.itemKey(current) !== key
          )
      );

      return;
    }


    const maxStock =
      item.maxStock;


    const safeQuantity =
      Math.min(
        quantity,
        maxStock
      );


    this._items.update(
      list =>
        list.map(
          current =>
            this.itemKey(current) === key
              ? {
                  ...current,
                  quantity: Math.max(
                    1,
                    safeQuantity
                  )
                }
              : current
        )
    );


    if (
      quantity >
      maxStock
    ) {

      this.cartError.set(
        `Il ne reste que ${maxStock} exemplaire${
          maxStock > 1 ? 's' : ''
        } disponible${
          maxStock > 1 ? 's' : ''
        } pour cet article.`
      );

    } else {

      this.cartError.set(null);
    }
  }


  // ==========================================================
  // SUPPRIMER UN ARTICLE
  // ==========================================================

  removeItem(
    item: CartItem
  ): void {

    if (this._isAuthenticated()) {

      if (!item.cartItemId) {
        return;
      }


      this.isLoadingCart.set(true);

      this.cartError.set(null);


      this.http
        .delete<BackendCartResponse>(
          `${this.apiBase}/api/carts/me/items/${item.cartItemId}`
        )
        .pipe(

          tap((response) => {

            this.applyBackendResponse(
              response
            );
          }),

          catchError((error) => {

            console.error(
              'Cart remove item error:',
              error
            );

            this.cartError.set(
              this.extractError(error)
            );

            return of(null);
          }),

          finalize(() =>
            this.isLoadingCart.set(false)
          )

        )
        .subscribe();

    } else {

      const key =
        this.itemKey(item);


      this._items.update(
        list =>
          list.filter(
            current =>
              this.itemKey(current) !== key
          )
      );


      this.cartError.set(null);
    }
  }


  // ==========================================================
  // VIDER LE PANIER
  // ==========================================================

  clearCart(): void {

    if (this._isAuthenticated()) {

      this.isLoadingCart.set(true);

      this.cartError.set(null);


      this.http
        .delete<BackendCartResponse>(
          `${this.apiBase}/api/carts/me`
        )
        .pipe(

          tap((response) => {

            this.applyBackendResponse(
              response
            );
          }),

          catchError((error) => {

            console.error(
              'Clear cart error:',
              error
            );

            this.cartError.set(
              this.extractError(error)
            );

            return of(null);
          }),

          finalize(() =>
            this.isLoadingCart.set(false)
          )

        )
        .subscribe();

    } else {

      this._items.set([]);

      this.cartError.set(null);
    }
  }


  // ==========================================================
  // CLÉ D'IDENTIFICATION D'UN ARTICLE
  // ==========================================================

  itemKey(
    item: Pick<
      CartItem,
      'productId' | 'color' | 'size'
    >
  ): string {

    return `${item.productId}|${item.color ?? ''}|${item.size ?? ''}`;
  }


  // ==========================================================
  // SYNCHRONISATION PANIER INVITÉ → BACKEND
  // ==========================================================

  private syncAndLoadBackendCart(): void {

    const guestItems =
      this.loadFromStorage();


    const syncable =
      guestItems.filter(
        item => !!item.variantId
      );


    if (!syncable.length) {

      this.loadBackendCart();

      return;
    }


    this.isLoadingCart.set(true);


    const syncPayload = {

      items:
        syncable.map(
          item => ({
            variantId: item.variantId!,
            quantity: item.quantity
          })
        ),

      replaceExisting: false
    };


    this.http
      .post<BackendCartResponse>(
        `${this.apiBase}/api/carts/me/sync`,
        syncPayload
      )
      .pipe(

        tap((response) => {

          this.applyBackendResponse(
            response
          );


          try {

            localStorage.removeItem(
              STORAGE_KEY
            );

          } catch {
            // Rien à faire.
          }
        }),

        catchError((error) => {

          console.error(
            'Cart synchronization error:',
            error
          );


          this.cartError.set(
            this.extractError(error)
          );


          return this.http
            .get<BackendCartResponse>(
              `${this.apiBase}/api/carts/me`
            )
            .pipe(

              tap((response) => {

                this.applyBackendResponse(
                  response
                );
              }),

              catchError(() =>
                of(null)
              )
            );
        }),

        finalize(() =>
          this.isLoadingCart.set(false)
        )

      )
      .subscribe();
  }


  // ==========================================================
  // CHARGER LE PANIER BACKEND
  // ==========================================================

  private loadBackendCart(): void {

    this.isLoadingCart.set(true);


    this.http
      .get<BackendCartResponse>(
        `${this.apiBase}/api/carts/me`
      )
      .pipe(

        tap((response) => {

          this.applyBackendResponse(
            response
          );
        }),

        catchError((error) => {

          console.error(
            'Load backend cart error:',
            error
          );


          this.cartError.set(
            this.extractError(error)
          );


          return of(null);
        }),

        finalize(() =>
          this.isLoadingCart.set(false)
        )

      )
      .subscribe();
  }


  // ==========================================================
  // APPLICATION DE LA RÉPONSE BACKEND
  // ==========================================================

  private applyBackendResponse(
    response: BackendCartResponse | null
  ): void {

    if (!response) {
      return;
    }


    const mapped: CartItem[] =
      response.items.map(
        item => ({

          cartItemId:
            item.cartItemId,

          variantId:
            item.variantId,

          productId:
            item.productId,

          slug:
            item.productSlug,

          name:
            item.productName,

          price:
            item.unitPrice,

          imageUrl:
            item.imageUrl,

          imageAlt:
            item.imageAlt,

          color:
            item.color,

          size:
            item.size,

          quantity:
            item.quantity,

          maxStock:
            item.availableStock
        })
      );


    this._items.set(mapped);


    this._backendSubtotal.set(
      response.subtotal
    );


    this._backendTotalItems.set(
      response.totalItems
    );
  }


  // ==========================================================
  // TRANSFORMATION ERREUR BACKEND → MESSAGE FRIENDLY
  // ==========================================================

  private extractError(
    err: unknown
  ): string {

    const body =
      (err as {
        error?: unknown;
      })?.error;


    // --------------------------------------------------------
    // Pas de réponse backend
    // --------------------------------------------------------

    if (!body) {

      return 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.';
    }


    // --------------------------------------------------------
    // Backend renvoie une string
    // --------------------------------------------------------

    if (typeof body === 'string') {

      try {

        const parsed =
          JSON.parse(
            body
          ) as BackendErrorResponse;


        return this.getFriendlyErrorMessage(
          parsed.code,
          parsed.message
        );

      } catch {

        return body ||
          'Une erreur est survenue. Veuillez réessayer.';
      }
    }


    // --------------------------------------------------------
    // Backend renvoie directement ErrorResponse
    // --------------------------------------------------------

    const response =
      body as BackendErrorResponse;


    return this.getFriendlyErrorMessage(
      response.code,
      response.message
    );
  }


  // ==========================================================
  // MESSAGES FRIENDLY
  // ==========================================================

  private getFriendlyErrorMessage(
    code?: string,
    backendMessage?: string
  ): string {

    switch (code) {

      // ------------------------------------------------------
      // QUANTITÉ
      // ------------------------------------------------------

      case 'QUANTITY_INVALID':

        return (
          'La quantité sélectionnée n’est pas valide.'
        );


      // ------------------------------------------------------
      // RUPTURE DE STOCK
      // ------------------------------------------------------

      case 'OUT_OF_STOCK':

        return (
          'Cet article est actuellement en rupture de stock.'
        );


      // ------------------------------------------------------
      // STOCK INSUFFISANT
      // ------------------------------------------------------

      case 'INSUFFICIENT_STOCK':

        return (
          'La quantité demandée n’est plus disponible. ' +
          'Le stock a peut-être changé depuis que vous avez ajouté cet article au panier.'
        );


      // ------------------------------------------------------
      // ARTICLE N'APPARTENANT PAS AU PANIER
      // ------------------------------------------------------

      case 'ITEM_NOT_OWNED':

        return (
          'Cet article ne peut pas être modifié dans ce panier.'
        );


      // ------------------------------------------------------
      // PANIER VIDE
      // ------------------------------------------------------

      case 'CART_EMPTY':

        return (
          'Votre panier est vide.'
        );


      // ------------------------------------------------------
      // VARIANTE INTROUVABLE
      // ------------------------------------------------------

      case 'VARIANT_NOT_FOUND':

        return (
          'Cette variante du produit n’est plus disponible.'
        );


      // ------------------------------------------------------
      // PRODUIT INTROUVABLE
      // ------------------------------------------------------

      case 'PRODUCT_NOT_FOUND':

        return (
          'Ce produit n’est plus disponible.'
        );


      // ------------------------------------------------------
      // UTILISATEUR
      // ------------------------------------------------------

      case 'USER_NOT_FOUND':

        return (
          'Votre compte n’a pas pu être retrouvé. Veuillez vous reconnecter.'
        );


      // ------------------------------------------------------
      // PAR DÉFAUT
      // ------------------------------------------------------

      default:

        return (
          backendMessage ||
          'Une erreur est survenue. Veuillez réessayer.'
        );
    }
  }


  // ==========================================================
  // LOCAL STORAGE
  // ==========================================================

  private loadFromStorage(): CartItem[] {

    try {

      if (
        typeof localStorage === 'undefined'
      ) {
        return [];
      }


      const raw =  localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];

    } catch {

      return [];
    }
  }
  public clearCartFromStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}


