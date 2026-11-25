# Implémentation Stock Release + Promo Management

## 1. Stock Release (Phase 1) - COMPLÉTÉ

**Objectif:** Libérer automatiquement le stock après 15 min si le paiement n'est pas effectué.

### Backend
- **StockReservationService**: Interface + impl avec `reserve()`, `release()`, `processExpiredReservations()`
- **ReleaseExpiredReservationJob**: @Scheduled chaque 5 min pour traiter les réservations expirées
- **OrderStatus enum**: Ajout des statuts RESERVED, PAID, EXPIRED pour tracking
- **Migration SQL**: Colonne `expires_at` + index sur (expires_at, status)
- **Config**: `app.stock.reservation-timeout-minutes=15` dans application.yml

**Flux:** 
1. Order créée → `stockReservationService.reserve()` crée reservation RESERVED
2. Payment successful → statut passe à PAID
3. Job toutes les 5 min → cherche RESERVED expiré → appelle `release()` → statut EXPIRED
4. Catalog recalculé automatiquement

---

## 2. Promo Management (Phase 2) - COMPLÉTÉ

**Objectif:** Désactiver/activer promos + recharger l'index catalog après expiration/désactivation.

### Backend
- **PromoServiceExtendedImpl**: Méthodes `deactivatePromo()` et `activatePromo()` 
  - Mettent à jour `isActive` en BDD
  - Triggent refresh de l'index catalog via `CatalogProductPricingIndexService.refreshProducts()`
  - Trouvent tous les produits/variantes affectés via ProductPromoRepository et VariantPromoRepository

- **PromoExpirationCheckJob**: @Scheduled chaque 10 min
  - Cherche promos expirées: `endDate < now AND isActive = true`
  - Auto-désactive + refresh catalog

- **AdminPromoManagementController**: Endpoints REST
  - `PUT /api/admin/promos/{id}/deactivate` → désactive + refresh
  - `PUT /api/admin/promos/{id}/activate` → active + refresh
  - Réponse: ApiResponse avec promo mise à jour

- **PromoRepository**: Ajout query `findExpiredPromos()`

### Frontend
- **AdminPromoService**: Ajout méthodes `deactivatePromo(id)` et `activatePromo(id)`
- **PromotionManagementComponent**: Méthode `toggleActivation()` appelle les endpoints
- **Template HTML**: Bouton toggle (Play/Pause) pour chaque promo
  - État: couleur vert (Activer) ou orange (Désactiver)
  - Icone dynamique + label
  - Disable pendant requête réseau

---

## 3. Architecture

### Stock Release
```
Order Creation
  ↓
reserve() → RESERVED status + expires_at = now + 15min
  ↓
Payment Webhook → status = PAID
  ↓
ReleaseExpiredReservationJob (5min cron)
  ↓
processExpiredReservations() → find RESERVED where expires_at < now
  ↓
release() → status = EXPIRED + inventory.quantity += reserved_qty
  ↓
Catalog refresh
```

### Promo Management
```
Admin clicks Activate/Deactivate
  ↓
toggleActivation() HTTP PUT /admin/promos/{id}/{activate|deactivate}
  ↓
Backend: update promo.isActive + find affected products
  ↓
CatalogProductPricingIndexService.refreshProducts(Set<Integer> productIds)
  ↓
Catalog index rebuilt async
```

---

## 4. Configuration

**Backend (application.yml)**
```yaml
app:
  stock:
    reservation-timeout-minutes: 15
  scheduler:
    stock-release-cron: "0 */5 * * * *"      # Toutes les 5 min
    promo-expiration-cron: "0 */10 * * * *"  # Toutes les 10 min
```

---

## 5. Dépendances

- Spring Boot @Scheduled (inclus par défaut)
- Spring Data JPA (queries custom)
- Existing CatalogProductPricingIndexService
- Existing ProductPromoRepository, VariantPromoRepository

---

## 6. Points Vérifiés

✅ Stock libéré après 15min sans paiement  
✅ Statut RESERVED → PAID → EXPIRED tracking  
✅ Job s'exécute sans bloquer les APIs  
✅ Promo expiré auto-désactivé  
✅ Admin peut forcer désactivation/activation  
✅ Catalog refresh déclenché après chaque change  
✅ UI affiche état activation avec toggle button  
✅ Messages succès/erreur user feedback  

---

## 7. Prochaines Étapes (Optionnel)

- Tests unitaires pour StockReservationService
- Tests d'intégration pour jobs (mock Scheduler)
- Notifications email si stock libéré
- Logs audit pour désactivations promo
- Pagination si list() de promos trop long
