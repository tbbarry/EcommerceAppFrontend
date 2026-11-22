import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, finalize, takeUntil } from 'rxjs';
import { AdminProductService } from '../../core/admin-product.service';
import { AdminPromo, AdminPromoService, PromoAssignment, PromoTarget } from '../../core/admin-promo.service';
import { ProductAdminDetailResponse, ProductAdminListResponse, VariantAdminResponse } from '../../models/admin-product.model';

@Component({
  selector: 'app-promotion-assignments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './promotion-assignments.component.html',
  styleUrls: ['./promotion-management.component.css', './promotion-assignments.component.css']
})
export class PromotionAssignmentsComponent implements OnInit {
  private readonly promosService = inject(AdminPromoService);
  private readonly productsService = inject(AdminProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeChanged = new Subject<void>();

  promo: AdminPromo | null = null;
  promoId: number | null = null;
  assignments: PromoAssignment[] = [];
  products: ProductAdminListResponse[] = [];
  selectedProduct: ProductAdminDetailResponse | null = null;
  selectedVariantId = 0;
  targetType: PromoTarget = 'PRODUCT';
  productPage = 0;
  productPages = 0;
  requestedProductPage = 0;
  addOpen = false;
  loadingPromo = false;
  loadingAssignments = false;
  loadingProducts = false;
  loadingProduct = false;
  busy = false;
  promoError = '';
  assignmentsError = '';
  productsError = '';
  productError = '';
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.routeChanged.next();
      const rawId = params.get('id');
      const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : 0;
      this.promoId = Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
      this.promo = null;
      this.assignments = [];
      this.products = [];
      this.selectedProduct = null;
      this.selectedVariantId = 0;
      this.targetType = 'PRODUCT';
      this.productPage = 0;
      this.productPages = 0;
      this.requestedProductPage = 0;
      this.addOpen = false;
      this.promoError = '';
      this.assignmentsError = '';
      this.productsError = '';
      this.productError = '';
      this.errorMessage = '';
      this.successMessage = '';
      if (this.promoId === null) {
        this.promoError = 'Identifiant de promotion invalide.';
      } else {
        this.loadPromo();
      }
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canLeave(): boolean {
    if (this.busy) {
      this.errorMessage = 'Veuillez attendre la fin de l’opération avant de quitter cette page.';
      return false;
    }
    return true;
  }

  loadPromo(): void {
    if (this.promoId === null || this.loadingPromo) return;
    this.loadingPromo = true;
    this.promoError = '';
    this.promosService.get(this.promoId).pipe(
      takeUntil(this.routeChanged), finalize(() => this.loadingPromo = false), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: promo => {
        this.promo = promo;
        this.loadAssignments();
      },
      error: error => this.promoError = this.describeError(error, 'Impossible de charger cette promotion.')
    });
  }

  loadAssignments(): void {
    if (this.promoId === null || this.loadingAssignments) return;
    this.loadingAssignments = true;
    this.assignmentsError = '';
    this.promosService.assignments(this.promoId).pipe(
      takeUntil(this.routeChanged), finalize(() => this.loadingAssignments = false), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: assignments => this.assignments = assignments,
      error: error => this.assignmentsError = this.describeError(error, 'Impossible de charger les attributions.')
    });
  }

  openAdd(): void {
    this.addOpen = true;
    if (!this.products.length) this.loadProducts(this.productPage);
  }

  loadProducts(page: number): void {
    if (page < 0 || (this.productPages > 0 && page >= this.productPages) || this.loadingProducts) return;
    this.requestedProductPage = page;
    this.loadingProducts = true;
    this.productsError = '';
    this.productsService.getProductsList(page, 8).pipe(
      takeUntil(this.routeChanged), finalize(() => this.loadingProducts = false), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: result => {
        this.products = result.content;
        this.productPage = result.number;
        this.productPages = result.totalPages;
      },
      error: error => this.productsError = this.describeError(error, 'Impossible de charger les produits.')
    });
  }

  selectProduct(product: ProductAdminListResponse): void {
    if (this.loadingProduct || this.busy) return;
    this.selectedProduct = null;
    this.selectedVariantId = 0;
    this.targetType = 'PRODUCT';
    this.productError = '';
    this.loadingProduct = true;
    this.productsService.getProductDetail(product.id).pipe(
      takeUntil(this.routeChanged), finalize(() => this.loadingProduct = false), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: result => this.selectedProduct = result,
      error: error => this.productError = this.describeError(error, 'Impossible de charger ce produit. Sélectionnez-le à nouveau pour réessayer.')
    });
  }

  setTarget(type: PromoTarget): void {
    this.targetType = type;
    this.selectedVariantId = 0;
  }

  assign(): void {
    if (this.busy || this.loadingAssignments || this.assignmentsError || this.promoId === null || !this.selectedProduct) return;
    const targetId = this.targetType === 'PRODUCT' ? this.selectedProduct.id : Number(this.selectedVariantId);
    if (!targetId || this.isAssigned(this.targetType, targetId)) return;
    this.mutate(this.promosService.assign(this.promoId, this.targetType, targetId),
      'Attribution enregistrée. Le prix du catalogue a été recalculé.', () => {
        this.addOpen = false;
        this.selectedProduct = null;
        this.loadAssignments();
      });
  }

  removeAssignment(assignment: PromoAssignment): void {
    if (this.busy || this.loadingAssignments || this.assignmentsError || this.promoId === null) return;
    const label = assignment.type === 'PRODUCT' ? assignment.productName : `${assignment.productName} — ${assignment.variantSku}`;
    if (!confirm(`Retirer la promotion de « ${label} » ? La promotion elle-même ne sera pas supprimée.`)) return;
    this.mutate(this.promosService.removeAssignment(this.promoId, assignment),
      'Attribution retirée. Le prix du catalogue a été recalculé.', () => this.loadAssignments());
  }

  isAssigned(type: PromoTarget, id: number): boolean {
    return this.assignments.some(item => item.type === type
      && (type === 'PRODUCT' ? item.productId === id : item.variantId === id));
  }

  variantLabel(variant: VariantAdminResponse): string {
    const attributes = variant.attributeValues.map(value => `${value.attributeName} : ${value.attributeValueName}`).join(' · ');
    return attributes ? `${variant.sku} — ${attributes}` : variant.sku;
  }

  private mutate(request: Observable<unknown>, message: string, onSuccess: () => void): void {
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    request.pipe(finalize(() => this.busy = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.errorMessage = ''; this.successMessage = message; onSuccess(); },
      error: error => this.errorMessage = this.describeError(error, 'L’opération a échoué.')
    });
  }

  private describeError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return `${fallback} Le serveur est inaccessible.`;
    if (error.status === 401) return `${fallback} Veuillez vous reconnecter.`;
    if (error.status === 403) return `${fallback} Accès administrateur refusé.`;
    if (error.status === 404) return `${fallback} Élément introuvable.`;
    if (error.error && typeof error.error.message === 'string') return `${fallback} ${error.error.message}`;
    return `${fallback} (HTTP ${error.status})`;
  }
}
