import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CheckoutIdempotencyService {

  private readonly STORAGE_KEY = 'checkout_idempotency_key';

  /**
   * Retourne la clé actuelle.
   *
   * Si aucune clé n'existe encore, elle est générée une seule fois
   * puis stockée dans sessionStorage.
   */
  getOrCreateKey(): string {

    let key = sessionStorage.getItem(this.STORAGE_KEY);

    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(this.STORAGE_KEY, key);
    }

    return key;
  }

  /**
   * Supprime la clé lorsque le checkout est terminé.
   *
   * À appeler après un paiement réussi / checkout terminé.
   */
  clear(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}

