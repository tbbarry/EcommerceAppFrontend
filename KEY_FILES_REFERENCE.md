# Quick Reference - Key Files

## 📋 Documentation (This Folder)

| File | Purpose |
|------|---------|
| **IMPLEMENTATION_SUMMARY.md** | Overview of both phases, architecture, config |
| **VALIDATION_CHECKLIST.md** | Test cases + integration notes |
| **IMPLEMENTATION_DONE.md** | Phase 1 details (stock release) |
| **KEY_FILES_REFERENCE.md** | This file |

---

## 🔧 Backend Files (EcommerceBackendApp)

### Core Stock Release Logic
- **`service/impl/StockReservationServiceImpl.java`**
  - `reserve(orderId, items)` → creates RESERVED reservation
  - `release(reservationId)` → frees stock, sets EXPIRED
  - `processExpiredReservations()` → batch release after timeout

- **`job/ReleaseExpiredReservationJob.java`**
  - @Scheduled every 5 minutes (configurable)
  - Calls `stockReservationService.processExpiredReservations()`

### Core Promo Management
- **`service/impl/PromoServiceExtendedImpl.java`**
  - `deactivatePromo(id)` → isActive=false + refresh catalog
  - `activatePromo(id)` → isActive=true + refresh catalog

- **`job/PromoExpirationCheckJob.java`**
  - @Scheduled every 10 minutes
  - Auto-disables expired promos

- **`controller/AdminPromoManagementController.java`**
  - `PUT /api/admin/promos/{id}/deactivate`
  - `PUT /api/admin/promos/{id}/activate`

### Database
- **`repository/StockReservationRepository.java`**
  - Custom query: find RESERVED by orderId
  - Custom query: find expired reservations

- **`repository/PromoRepository.java`**
  - Custom query: `findExpiredPromos()` (endDate < now AND isActive=true)

- **`entity/OrderStatus.java`** - Enum
  - Added: RESERVED, PAID, EXPIRED states

### Configuration
- **`application.yml`**
  ```yaml
  app:
    stock:
      reservation-timeout-minutes: 15
    scheduler:
      stock-release-cron: "0 */5 * * * *"
      promo-expiration-cron: "0 */10 * * * *"
  ```

- **Migration SQL** (db/migration/V*.sql)
  - Column: `stock_reservation.expires_at`
  - Index: `(expires_at, status)`

---

## 🎨 Frontend Files (EcommerceAppFrontend)

### Service
- **`src/app/core/admin-promo.service.ts`**
  - `deactivatePromo(id)` → PUT /api/admin/promos/{id}/deactivate
  - `activatePromo(id)` → PUT /api/admin/promos/{id}/activate

### Component (Controller)
- **`src/app/features/admin/promotion-management.component.ts`**
  - `toggleActivation(promo)` → calls service deactivate/activate
  - Maintains loading/error states

### Template (View)
- **`src/app/features/admin/promotion-management.component.html`**
  - Toggle button in promo-card
  - Classes: `btn-warning` (Désactiver) or `btn-success` (Activer)
  - Icons: `bi-pause-circle` (active) or `bi-play-circle` (inactive)

---

## 🔄 Data Flow Diagram

### Stock Release Flow
```
Order Creation
    ↓
StockReservationService.reserve()
    ↓ Creates reservation with expires_at = now + 15min
StockReservation (status=RESERVED)
    ↓
Payment Webhook (optional)
    ↓ Updates status
StockReservation (status=PAID)
    ↓
[Every 5 min] ReleaseExpiredReservationJob
    ↓ Finds RESERVED where expires_at < now
    ↓
StockReservationService.release()
    ↓ Updates inventory, sets status=EXPIRED
StockReservation (status=EXPIRED)
    ↓
CatalogProductPricingIndexService.refreshProducts()
```

### Promo Management Flow
```
Admin UI - Toggle Button
    ↓
toggleActivation(promo)
    ↓
HTTP PUT /api/admin/promos/{id}/{activate|deactivate}
    ↓
Backend: PromoServiceExtendedImpl.{activate|deactivate}Promo()
    ↓ Updates promo.isActive
    ↓
CatalogProductPricingIndexService.refreshProducts()
    ↓ Fetches all affected products (from product_promos + variant_promos)
    ↓
Catalog Index Rebuilt (async)
    ↓
Frontend UI Updates (button state + success message)
```

---

## ⚙️ Configuration Quick Reference

| Setting | Value | File |
|---------|-------|------|
| Stock timeout | 15 minutes | application.yml |
| Release check interval | Every 5 min | ReleaseExpiredReservationJob |
| Promo expiration check | Every 10 min | PromoExpirationCheckJob |
| Promo timeout cron | `0 */10 * * * *` | application.yml |
| Stock timeout cron | `0 */5 * * * *` | application.yml |

**To adjust:** Edit application.yml before restarting backend

---

## 🚦 Testing Endpoints

### Manual Testing (Postman/curl)

**Deactivate Promo:**
```bash
curl -X PUT http://localhost:8080/api/admin/promos/1/deactivate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Activate Promo:**
```bash
curl -X PUT http://localhost:8080/api/admin/promos/1/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check Promo Status:**
```bash
curl http://localhost:8080/api/promos/1
```

---

## 📌 Important Notes

1. **CatalogProductPricingIndexService** must exist with signature:
   ```java
   public void refreshProducts(Set<Integer> productIds) { ... }
   ```

2. **ProductPromoRepository** must have:
   ```java
   List<ProductPromo> findByPromoId(Integer promoId);
   ```

3. **VariantPromoRepository** must have:
   ```java
   List<VariantPromo> findByPromoId(Integer promoId);
   ```

4. All times use **server timezone** (check application.yml)

5. Jobs are **async & non-blocking** - no performance impact

---

## 🎯 Next Steps (Optional Enhancements)

- [ ] Add unit tests for StockReservationService
- [ ] Add integration tests for jobs (mock @Scheduled)
- [ ] Email notifications when stock released
- [ ] Audit log for promo state changes
- [ ] Pagination for large promo lists
- [ ] Batch toggle (select multiple promos)
