import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { environment } from '../../../environments/environment';
import { CartService } from '../../core/cart.service';
import {
  ApiProductDetail,
  ProductDetailViewModel,
  ProductImageViewModel,
  ProductVariantViewModel,
  buildProductDetailViewModel
} from './detail/product-detail-view-model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  vm: ProductDetailViewModel | null = null;
  isLoading = true;
  isAddingToCart = false;

  selectedColor: string | null = null;
  selectedSize: string | null = null;
  selectedImageIndex = 0;
  quantity = 1;
  @ViewChild('thumbRail') thumbRail?: ElementRef<HTMLDivElement>;

  isImageViewerOpen = false;
  zoomLevel = 1;
  readonly minZoom = 1;
  readonly maxZoom = 3;
  readonly zoomStep = 0.25;
  readonly cartFeedback = signal<'idle' | 'added'>('idle');
  private cartFeedbackHandle: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.vm = null;
        this.isLoading = false;
        return;
      }

      this.loadBySlug(slug);
    });
  }

  private loadBySlug(slug: string): void {
    this.isLoading = true;
    this.vm = null;

    const baseUrl = (environment as { apiBaseUrl?: string }).apiBaseUrl || '';

    this.http.get<ApiProductDetail>(`${baseUrl}/api/products/slug/${encodeURIComponent(slug)}`).subscribe({
      next: (product) => {
        this.vm = buildProductDetailViewModel(product);
        this.initializeSelection();
        this.isLoading = false;
      },
      error: () => {
        this.vm = null;
        this.isLoading = false;
      }
    });
  }

  private initializeSelection(): void {
    this.selectedColor = null;
    this.selectedSize = null;
    this.selectedImageIndex = 0;
    this.quantity = 1;
    this.isImageViewerOpen = false;

    if (!this.vm) {
      return;
    }

    if (this.vm.variants.length === 1) {
      const singleVariant = this.vm.variants[0];
      this.selectedColor = singleVariant.color;
      this.selectedSize = singleVariant.size;
      this.syncQuantity();
      return;
    }

    if (this.vm.colors.length === 1 && this.vm.colors[0].available) {
      this.selectedColor = this.vm.colors[0].name;
      this.autoSelectPreferredSizeForSelectedColor();
      return;
    }

    this.autoSelectPreferredSizeForSelectedColor();
  }

  get breadcrumbSegments(): string[] {
    return this.vm?.breadcrumbs || [];
  }

  get galleryImages(): ProductImageViewModel[] {
    if (!this.vm) {
      return [];
    }

    const combined = [
      ...this.vm.defaultImages,
      ...Object.values(this.vm.imagesByColor).flatMap((images) => images)
    ];

    const uniqueById = new Map<number, ProductImageViewModel>();
    combined.forEach((image) => {
      if (!uniqueById.has(image.id)) {
        uniqueById.set(image.id, image);
      }
    });

    const colorOrder = new Map<string, number>();
    this.vm.colors.forEach((color, index) => {
      colorOrder.set(color.name.trim().toLowerCase(), index);
    });

    return Array.from(uniqueById.values()).sort((left, right) => {
      const leftKey = (left.color || '').trim().toLowerCase();
      const rightKey = (right.color || '').trim().toLowerCase();
      const leftRank = colorOrder.get(leftKey) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = colorOrder.get(rightKey) ?? Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (leftKey !== rightKey) {
        return leftKey.localeCompare(rightKey);
      }

      if (left.isMain !== right.isMain) {
        return Number(right.isMain) - Number(left.isMain);
      }

      return left.id - right.id;
    });
  }

  get currentImage(): ProductImageViewModel | null {
    const images = this.galleryImages;
    return images[this.selectedImageIndex] || images[0] || null;
  }

  get requiresColor(): boolean {
    return (this.vm?.colors.length || 0) > 0;
  }

  get requiresSize(): boolean {
    return (this.vm?.sizes.length || 0) > 0;
  }

  get isSelectionComplete(): boolean {
    const hasColor = !this.requiresColor || !!this.selectedColor;
    const hasSize = !this.requiresSize || !!this.selectedSize;
    return hasColor && hasSize;
  }

  get selectedVariant(): ProductVariantViewModel | null {
    if (!this.vm) {
      return null;
    }

    if (this.selectedColor && this.selectedSize) {
      const variantId = this.getMatrixCell(this.selectedColor, this.selectedSize)?.variantId;
      if (variantId) {
        return this.vm.variants.find((variant) => variant.id === variantId) || null;
      }

      return this.vm.variants.find((variant) =>
        this.sameValue(variant.color, this.selectedColor)
        && this.sameValue(variant.size, this.selectedSize)
      ) || null;
    }

    if (!this.requiresColor && !this.requiresSize && this.vm.variants.length === 1) {
      return this.vm.variants[0];
    }

    return null;
  }

  get selectedVariantStock(): number {
    return this.selectedVariant?.stock || 0;
  }

  get sizeDisabledMap(): Record<string, boolean> {
    const map: Record<string, boolean> = {};

    if (!this.vm) {
      return map;
    }

    this.vm.sizes.forEach((size) => {
      map[size.value] = !this.isSizeSelectable(size.value);
    });

    return map;
  }

  get selectionHint(): string | null {
    if (!this.vm) {
      return null;
    }

    if (!this.isSelectionComplete) {
      return 'Sélectionnez une couleur et une taille pour activer le panier.';
    }

    if (!this.selectedVariant) {
      return 'Combinaison indisponible. Essayez une autre variante.';
    }

    return null;
  }

  get stockLabel(): string {
    if (!this.isSelectionComplete) {
      return 'Sélectionnez une couleur et une taille';
    }

    if (this.selectedVariantStock <= 0) {
      return 'Rupture de stock';
    }

    if (this.selectedVariantStock <= 3) {
      return 'Stock faible';
    }

    return 'En stock';
  }

  get stockToneClass(): string {
    if (!this.isSelectionComplete) {
      return 'stock-indicator--muted';
    }

    if (this.selectedVariantStock <= 0) {
      return 'stock-indicator--danger';
    }

    if (this.selectedVariantStock <= 3) {
      return 'stock-indicator--warning';
    }

    return 'stock-indicator--success';
  }

  colorSwatch(name: string): string {
    const palette: Record<string, string> = {
      noir: '#111827',
      blanc: '#f8fafc',
      blanc_casse: '#f3efe6',
      bleu: '#2563eb',
      gris: '#6b7280',
      rouge: '#dc2626',
      vert: '#16a34a',
      jaune: '#eab308',
      beige: '#d6bfa2',
      marron: '#7c4a2f'
    };

    return palette[name.trim().toLowerCase().replace(/\s+/g, '_')] || '#94a3b8';
  }

  priceToDisplay(): string {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    if (!this.vm) {
      return formatter.format(0);
    }

    if (this.selectedVariant) {
      return formatter.format(this.selectedVariant.finalPrice);
    }

    if (!this.vm.pricing.hasDiscount) {
      if (this.vm.pricing.finalPriceMin === this.vm.pricing.finalPriceMax) {
        return formatter.format(this.vm.pricing.finalPriceMin);
      }

      return `À partir de ${formatter.format(this.vm.pricing.finalPriceMin)}`;
    }

    return `À partir de ${formatter.format(this.vm.pricing.finalPriceMin)}`;
  }

  strikePriceToDisplay(): string | null {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    if (!this.vm) {
      return null;
    }

    if (this.selectedVariant && this.selectedVariant.appliedDiscountPercent > 0) {
      return formatter.format(this.selectedVariant.price);
    }

    if (!this.selectedVariant && this.vm.pricing.hasDiscount) {
      return formatter.format(this.vm.pricing.basePriceMin);
    }

    return null;
  }

  promoBadgeLabel(): string | null {
    if (!this.vm) {
      return null;
    }

    if (this.selectedVariant && this.selectedVariant.appliedDiscountPercent > 0) {
      return `-${Math.round(this.selectedVariant.appliedDiscountPercent)}%`;
    }

    if (!this.vm.pricing.hasDiscount) {
      return null;
    }

    if (this.vm.pricing.promoScope === 'GLOBAL' && this.vm.pricing.discountPercentGlobal != null) {
      return `-${this.vm.pricing.discountPercentGlobal}%`;
    }

    if (this.vm.pricing.promoScope === 'VARIANT' && this.vm.pricing.discountPercentMax != null) {
      return `Jusqu'à -${this.vm.pricing.discountPercentMax}%`;
    }

    return null;
  }

  variableDiscountNote(): string | null {
    if (!this.vm || this.selectedVariant) {
      return null;
    }

    if (
      this.vm.pricing.promoScope === 'VARIANT'
      && this.vm.pricing.discountPercentMin != null
      && this.vm.pricing.discountPercentMax != null
      && this.vm.pricing.discountPercentMin !== this.vm.pricing.discountPercentMax
    ) {
      return 'Réduction variable selon la variante';
    }

    return null;
  }

  get appliedPromotionCode(): string | null {
    if (!this.vm) {
      return null;
    }

    if (this.selectedVariant) {
      const promo = this.vm.variantPromotions.find(
        (item) => item.variantId === this.selectedVariant?.id && !!item.code
      );

      if (promo?.code) {
        return promo.code;
      }
    }

    const globalPromo = this.vm.globalPromotions.find((item) => !!item.code);
    return globalPromo?.code || null;
  }

  onColorChoose(colorName: string): void {
    if (!this.vm) {
      return;
    }

    const selectedColor = this.vm.colors.find((item) => item.name === colorName);
    if (!selectedColor) {
      return;
    }

    this.selectedColor = colorName;

    if (this.selectedSize && !this.isSizeSelectable(this.selectedSize)) {
      this.selectedSize = null;
    }

    this.autoSelectPreferredSizeForSelectedColor();
    this.focusImageForColor(colorName);
    this.syncQuantity();
  }

  onSizeChoose(sizeValue: string): void {
    this.selectedSize = sizeValue;
    this.syncQuantity();
  }

  private autoSelectPreferredSizeForSelectedColor(): void {
    if (!this.vm || this.selectedSize) {
      return;
    }

    const availableSizes = this.vm.sizes.map((size) => size.value).filter((value) => this.isSizeSelectable(value));

    if (availableSizes.length) {
      this.selectedSize = availableSizes[0];
    }
  }

  isColorSelectable(colorName: string): boolean {
    if (!this.vm) {
      return false;
    }

    const color = this.vm.colors.find((item) => this.sameValue(item.name, colorName));

    if (color?.available) {
      return true;
    }

    return this.vm.variants.some((variant) => this.sameValue(variant.color, colorName) && variant.stock > 0);
  }

  isSizeSelectable(sizeValue: string): boolean {
    if (!this.vm) {
      return false;
    }

    if (this.selectedColor) {
      const cell = this.getMatrixCell(this.selectedColor, sizeValue);

      if (cell) {
        return cell.inStock || cell.stock > 0;
      }

      return this.vm.variants.some((variant) =>
        this.sameValue(variant.color, this.selectedColor)
        && this.sameValue(variant.size, sizeValue)
        && variant.stock > 0
      );
    }

    const size = this.vm.sizes.find((item) => this.sameValue(item.value, sizeValue));
    if (size?.available) {
      return true;
    }

    return this.vm.variants.some((variant) => this.sameValue(variant.size, sizeValue) && variant.stock > 0);
  }

  onGalleryIndexChange(index: number): void {
    this.selectedImageIndex = index;
    this.ensureActiveThumbnailVisible();
  }

  previousImage(): void {
    const images = this.galleryImages;
    if (!images.length) {
      return;
    }

    const nextIndex = this.selectedImageIndex === 0 ? images.length - 1 : this.selectedImageIndex - 1;
    this.onGalleryIndexChange(nextIndex);
  }

  nextImage(): void {
    const images = this.galleryImages;
    if (!images.length) {
      return;
    }

    const nextIndex = this.selectedImageIndex === images.length - 1 ? 0 : this.selectedImageIndex + 1;
    this.onGalleryIndexChange(nextIndex);
  }

  private focusImageForColor(colorName: string): void {
    const images = this.galleryImages;
    if (!images.length) {
      this.selectedImageIndex = 0;
      return;
    }

    const matchingIndex = images.findIndex((image) => this.sameValue(image.color, colorName));
    this.selectedImageIndex = matchingIndex >= 0 ? matchingIndex : 0;
    this.ensureActiveThumbnailVisible();
  }

  private ensureActiveThumbnailVisible(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      const rail = this.thumbRail?.nativeElement;
      if (!rail) {
        return;
      }

      const activeThumb = rail.querySelector<HTMLButtonElement>('.thumb-item--active');
      if (!activeThumb) {
        return;
      }

      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }, 0);
  }

  private sameValue(left: string | null | undefined, right: string | null | undefined): boolean {
    if (!left || !right) {
      return false;
    }

    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  private getMatrixColorKey(colorName: string): string | null {
    if (!this.vm) {
      return null;
    }

    const keys = Object.keys(this.vm.selectionMatrix);
    const exact = keys.find((key) => key === colorName);
    if (exact) {
      return exact;
    }

    return keys.find((key) => this.sameValue(key, colorName)) || null;
  }

  private getMatrixSizeKey(colorKey: string, sizeValue: string): string | null {
    if (!this.vm) {
      return null;
    }

    const sizeMap = this.vm.selectionMatrix[colorKey] || {};
    const keys = Object.keys(sizeMap);
    const exact = keys.find((key) => key === sizeValue);
    if (exact) {
      return exact;
    }

    return keys.find((key) => this.sameValue(key, sizeValue)) || null;
  }

  private getMatrixCell(colorName: string, sizeValue: string): { variantId: number; stock: number; inStock: boolean } | null {
    if (!this.vm) {
      return null;
    }

    const colorKey = this.getMatrixColorKey(colorName);
    if (!colorKey) {
      return null;
    }

    const sizeKey = this.getMatrixSizeKey(colorKey, sizeValue);
    if (!sizeKey) {
      return null;
    }

    return this.vm.selectionMatrix[colorKey]?.[sizeKey] || null;
  }

  private getImagesForColor(colorName: string): ProductImageViewModel[] {
    if (!this.vm) {
      return [];
    }

    const matchingEntries = Object.entries(this.vm.imagesByColor)
      .filter(([key]) => this.sameValue(key, colorName))
      .flatMap(([, images]) => images);

    const uniqueById = new Map<number, ProductImageViewModel>();
    matchingEntries.forEach((image) => {
      if (!uniqueById.has(image.id)) {
        uniqueById.set(image.id, image);
      }
    });

    return Array.from(uniqueById.values());
  }

  openImageViewer(): void {
    if (!this.currentImage) {
      return;
    }

    this.isImageViewerOpen = true;
    this.zoomLevel = 1;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  closeImageViewer(): void {
    this.isImageViewerOpen = false;
    this.zoomLevel = 1;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.maxZoom, +(this.zoomLevel + this.zoomStep).toFixed(2));
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.minZoom, +(this.zoomLevel - this.zoomStep).toFixed(2));
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }

  onViewerWheel(event: WheelEvent): void {
    event.preventDefault();

    if (event.deltaY < 0) {
      this.zoomIn();
      return;
    }

    this.zoomOut();
  }

  decreaseQuantity(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  increaseQuantity(): void {
    this.quantity = Math.min(this.maxQuantity(), this.quantity + 1);
  }

  onQuantityInputChange(value: number | string): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    this.quantity = Number.isFinite(parsed) ? parsed : 1;
    this.syncQuantity();
  }

  private syncQuantity(): void {
    this.quantity = Math.max(1, Math.min(this.maxQuantity(), Math.round(this.quantity || 1)));
  }

  maxQuantity(): number {
    const stock = this.selectedVariant?.stock || 0;
    return Math.max(1, stock);
  }

  canAddToCart(): boolean {
    return !!this.vm
      && this.isSelectionComplete
      && !!this.selectedVariant
      && this.selectedVariant.inStock
      && this.selectedVariant.stock > 0
      && !this.isAddingToCart;
  }

  addToCart(): void {
    if (!this.vm || !this.selectedVariant || !this.canAddToCart()) {
      return;
    }

    this.isAddingToCart = true;
    this.syncQuantity();

    const image = this.currentImage;

    this.cartService.addItem({
      variantId: this.selectedVariant.id,
      productId: this.vm.id,
      slug: this.vm.slug,
      name: this.vm.name,
      price: this.selectedVariant.finalPrice,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? null,
      color: this.selectedColor,
      size: this.selectedSize,
      maxStock: this.selectedVariant.stock,
      quantity: this.quantity
    }).subscribe((success) => {
      this.isAddingToCart = false;

      if (!success) {
        return;
      }

      this.cartFeedback.set('added');
      if (this.cartFeedbackHandle) {
        clearTimeout(this.cartFeedbackHandle);
      }

      this.cartFeedbackHandle = setTimeout(() => {
        this.cartFeedback.set('idle');
        this.cartFeedbackHandle = null;
      }, 2500);
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
