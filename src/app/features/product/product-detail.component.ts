import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CartService } from '../../core/cart.service';

interface ProductCategory {
  id: number;
  name: string;
  parentId?: number | null;
  parentName?: string | null;
}

interface ProductColor {
  name: string;
  available: boolean;
  totalStock: number;
  imageCount: number;
  sizesAvailable: string[];
}

interface ProductSize {
  value: string;
  available: boolean;
  totalStock: number;
}

interface ProductImage {
  id: number;
  url: string;
  alt?: string | null;
  color?: string | null;
  main: boolean;
}

interface ProductVariant {
  id: number;
  sku: string;
  color?: string | null;
  size?: string | null;
  price: number;
  stock: number;
  inStock: boolean;
  imageIds: number[];
}

interface StockSummary {
  inStock: boolean;
  totalStock: number;
}

interface SelectionState {
  variantId: number;
  stock: number;
  inStock: boolean;
}

interface ProductDetailResponse {
  id: number;
  slug: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  price: number;
  stockSummary: StockSummary;
  categories: ProductCategory[];
  colors: ProductColor[];
  sizes: ProductSize[];
  defaultImages: ProductImage[];
  imagesByColor: Record<string, ProductImage[]>;
  variants: ProductVariant[];
  selectionMatrix: Record<string, Record<string, SelectionState>>;
  createdAt?: string;
  updatedAt?: string;
}

type DetailTab = 'overview' | 'variants' | 'availability';

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
  private readonly cdr = inject(ChangeDetectorRef);

  product: ProductDetailResponse | null = null;
  isLoading = true;
  isImageViewerOpen = false;
  selectedColor: string | null = null;
  selectedSize: string | null = null;
  displayedImages: ProductImage[] = [];
  selectedImageIndex = 0;
  quantity = 1;
  activeTab: DetailTab = 'overview';
  readonly cartFeedback = signal<'idle' | 'added'>('idle');
  private cartFeedbackHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.product = null;
        this.isLoading = false;
        return;
      }

      this.isLoading = true;
      this.product = null;

      const baseUrl = (environment as { apiBaseUrl?: string }).apiBaseUrl || '';
      this.http
        .get<ProductDetailResponse>(`${baseUrl}/api/catalog/products/${encodeURIComponent(slug)}`)
        .subscribe({
          next: (data) => {
            this.product = data;
            this.initializeSelectionState();
            this.isLoading = false;
          },
          error: () => {
            this.product = null;
            this.isLoading = false;
          }
        });
    });
  }

  setActiveTab(tab: DetailTab): void {
    this.activeTab = tab;
  }

  selectColor(colorName: string): void {
    if (!this.isColorSelectable(colorName)) {
      return;
    }

    this.selectedColor = colorName;

    // Keep current size only if still valid for the newly selected color.
    if (this.selectedSize && !this.isSizeSelectable(this.selectedSize)) {
      this.selectedSize = null;
    }

    this.selectedImageIndex = this.getFirstImageIndexForColor(colorName);
    this.syncQuantity();
  }

  selectSize(sizeValue: string): void {
    if (!this.isSizeSelectable(sizeValue)) {
      return;
    }

    this.selectedSize = sizeValue;
    this.syncQuantity();
  }

  selectImage(index: number): void {
    if (index < 0 || index >= this.displayedImages.length) {
      return;
    }

    this.selectedImageIndex = index;
  }

  openImageViewer(): void {
    if (!this.getCurrentImage()) {
      return;
    }

    this.isImageViewerOpen = true;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  closeImageViewer(): void {
    this.isImageViewerOpen = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  showPreviousImage(): void {
    if (this.displayedImages.length < 2) {
      return;
    }

    this.selectedImageIndex = this.selectedImageIndex === 0 ? this.displayedImages.length - 1 : this.selectedImageIndex - 1;
  }

  showNextImage(): void {
    if (this.displayedImages.length < 2) {
      return;
    }

    this.selectedImageIndex = this.selectedImageIndex === this.displayedImages.length - 1 ? 0 : this.selectedImageIndex + 1;
  }

  decreaseQuantity(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  increaseQuantity(): void {
    this.quantity = Math.min(this.getMaxQuantity(), this.quantity + 1);
  }

  addToCart(): void {
    if (!this.canAddToCart() || !this.product) {
      return;
    }

    this.quantity = Math.max(1, Math.min(this.quantity, this.getMaxQuantity()));

    const currentImage = this.getCurrentImage();
    const variant = this.getCurrentVariant();
    this.cartService.addItem({
      variantId: variant?.id,
      productId: this.product.id,
      slug: this.product.slug,
      name: this.product.name,
      price: variant?.price ?? this.product.price,
      imageUrl: currentImage?.url ?? null,
      imageAlt: currentImage?.alt ?? null,
      color: this.selectedColor,
      size: this.selectedSize,
      maxStock: this.getResolvedStock(),
      quantity: this.quantity
    }).subscribe((success) => {
      if (!success) {
        this.cartFeedback.set('idle');
        this.cdr.markForCheck();
        return;
      }

      this.cartFeedback.set('added');
      this.cdr.markForCheck();
      if (this.cartFeedbackHandle) {
        clearTimeout(this.cartFeedbackHandle);
      }
      this.cartFeedbackHandle = setTimeout(() => {
        this.cartFeedback.set('idle');
        this.cdr.markForCheck();
        this.cartFeedbackHandle = null;
      }, 3000);
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  canAddToCart(): boolean {
    return this.isCurrentSelectionInStock() && this.hasRequiredSelections();
  }

  getSelectionRequirementMessage(): string | null {
    if (!this.product) {
      return null;
    }

    const requiresColor = this.product.colors.length > 0;
    const requiresSize = this.product.sizes.length > 0;
    const missingColor = requiresColor && !this.selectedColor;
    const missingSize = requiresSize && !this.selectedSize;

    if (missingColor && missingSize) {
      return 'Please select a color and a size before adding this item to your cart.';
    }

    if (missingColor) {
      return 'Please select a color before adding this item to your cart.';
    }

    if (missingSize) {
      return 'Please select a size before adding this item to your cart.';
    }

    return null;
  }

  onQuantityInputChange(value: number | string): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    this.quantity = Number.isFinite(parsed) ? parsed : 1;
    this.syncQuantity();
  }

  isColorSelected(colorName: string): boolean {
    return this.selectedColor === colorName;
  }

  isSizeSelected(sizeValue: string): boolean {
    return this.selectedSize === sizeValue;
  }

  isColorSelectable(colorName: string): boolean {
    const color = this.product?.colors.find((item) => item.name === colorName);
    return !!color?.available;
  }

  isSizeSelectable(sizeValue: string): boolean {
    if (!this.product) {
      return false;
    }

    if (this.selectedColor && this.product.selectionMatrix[this.selectedColor]) {
      return !!this.product.selectionMatrix[this.selectedColor][sizeValue]?.inStock;
    }

    const size = this.product.sizes.find((item) => item.value === sizeValue);
    return !!size?.available;
  }

  getCurrentImage(): ProductImage | null {
    return this.displayedImages[this.selectedImageIndex] || this.displayedImages[0] || null;
  }

  getCategoryLabel(): string {
    const category = this.product?.categories[0];
    if (!category) {
      return 'Produit';
    }

    return category.parentName ? `${category.parentName} / ${category.name}` : category.name;
  }

  getStockLabel(): string {
    if (!this.product) {
      return '';
    }

    const stock = this.getResolvedStock();
    return stock > 0 ? `Only ${stock} items remaining` : 'Currently unavailable';
  }

  getSelectedVariantLabel(): string {
    const parts = [this.selectedColor, this.selectedSize].filter((value): value is string => !!value);
    return parts.length ? parts.join(' / ') : 'Standard option';
  }

  getSelectedVariantSku(): string | null {
    return this.getCurrentVariant()?.sku || null;
  }

  getCurrentVariant(): ProductVariant | null {
    if (!this.product) {
      return null;
    }

    if (this.selectedColor && this.selectedSize) {
      const mappedVariantId = this.product.selectionMatrix[this.selectedColor]?.[this.selectedSize]?.variantId;
      if (mappedVariantId) {
        return this.product.variants.find((variant) => variant.id === mappedVariantId) || null;
      }
    }

    if (this.selectedColor && !this.selectedSize) {
      const colorVariant = this.product.variants.find(
        (variant) => variant.color === this.selectedColor && (variant.inStock || variant.stock > 0)
      );
      if (colorVariant) {
        return colorVariant;
      }
    }

    if (!this.selectedColor && this.selectedSize) {
      const sizeVariant = this.product.variants.find(
        (variant) => variant.size === this.selectedSize && (variant.inStock || variant.stock > 0)
      );
      if (sizeVariant) {
        return sizeVariant;
      }
    }

    if (this.product.variants.length === 1) {
      return this.product.variants[0];
    }

    const neutralVariant = this.product.variants.find(
      (variant) => !variant.color && !variant.size && (variant.inStock || variant.stock > 0)
    );
    if (neutralVariant) {
      return neutralVariant;
    }

    const firstInStockVariant = this.product.variants.find((variant) => variant.inStock || variant.stock > 0);
    if (firstInStockVariant) {
      return firstInStockVariant;
    }

    return null;
  }

  private hasRequiredSelections(): boolean {
    if (!this.product) {
      return true;
    }

    const requiresColor = this.product.colors.length > 0;
    const requiresSize = this.product.sizes.length > 0;
    const hasColor = !requiresColor || !!this.selectedColor;
    const hasSize = !requiresSize || !!this.selectedSize;

    return hasColor && hasSize;
  }

  isCurrentSelectionInStock(): boolean {
    return this.getResolvedStock() > 0;
  }

  getResolvedStock(): number {
    if (!this.product) {
      return 0;
    }

    if (this.selectedColor && this.selectedSize) {
      return this.product.selectionMatrix[this.selectedColor]?.[this.selectedSize]?.stock || 0;
    }

    if (this.selectedColor) {
      return this.product.colors.find((color) => color.name === this.selectedColor)?.totalStock || 0;
    }

    if (this.selectedSize) {
      return this.product.sizes.find((size) => size.value === this.selectedSize)?.totalStock || 0;
    }

    return this.product.stockSummary.totalStock || 0;
  }

  getMaxQuantity(): number {
    if (!this.product) {
      return 1;
    }

    return Math.max(this.getResolvedStock(), 1);
  }

  getColorSwatch(colorName: string): string {
    const palette: Record<string, string> = {
      noir: 'linear-gradient(135deg, #111827, #020617)',
      blanc: 'linear-gradient(135deg, #ffffff, #e5e7eb)',
      bleu: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      gris: 'linear-gradient(135deg, #9ca3af, #4b5563)',
      rouge: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      vert: 'linear-gradient(135deg, #22c55e, #15803d)',
      jaune: 'linear-gradient(135deg, #facc15, #ca8a04)',
      beige: 'linear-gradient(135deg, #e7d3b1, #c7a97b)',
      marron: 'linear-gradient(135deg, #8b5e3c, #5c3b28)'
    };

    return palette[colorName.trim().toLowerCase()] || 'linear-gradient(135deg, #cbd5e1, #64748b)';
  }

  getPreviewImageForColor(colorName: string): ProductImage | null {
    if (!this.product) {
      return null;
    }

    const colorImages = this.product.imagesByColor[colorName] || [];
    if (colorImages.length) {
      return colorImages[0];
    }

    return this.product.defaultImages[0] || null;
  }

  trackByImageId(_: number, image: ProductImage): number {
    return image.id;
  }

  private initializeSelectionState(): void {
    this.closeImageViewer();
    this.selectedColor = null;
    this.selectedSize = null;
    this.displayedImages = this.getOrderedImages();
    this.selectedImageIndex = 0;
    this.syncQuantity();
    this.activeTab = 'overview';
  }

  private syncDisplayedImages(): void {
    this.displayedImages = this.getOrderedImages();
    if (!this.displayedImages.length) {
      this.selectedImageIndex = 0;
      return;
    }

    if (this.selectedColor) {
      this.selectedImageIndex = this.getFirstImageIndexForColor(this.selectedColor);
      return;
    }

    if (this.selectedImageIndex >= this.displayedImages.length) {
      this.selectedImageIndex = 0;
    }
  }

  private getOrderedImages(): ProductImage[] {
    if (!this.product) {
      return [];
    }

    const product = this.product;

    const orderedImages: ProductImage[] = [];
    const seen = new Set<number>();

    const addImages = (images: ProductImage[]): void => {
      images
        .slice()
        .sort((left, right) => Number(right.main) - Number(left.main) || left.id - right.id)
        .forEach((image) => {
          if (seen.has(image.id)) {
            return;
          }

          seen.add(image.id);
          orderedImages.push(image);
        });
    };

    addImages(product.defaultImages);

    product.colors.forEach((color) => {
      addImages(product.imagesByColor[color.name] || []);
    });

    return orderedImages.length ? orderedImages : product.defaultImages;
  }

  private getFirstImageIndexForColor(colorName: string | null): number {
    if (!colorName) {
      return 0;
    }

    const image = this.getPreviewImageForColor(colorName);
    if (!image) {
      return 0;
    }

    const index = this.displayedImages.findIndex((item) => item.id === image.id);
    return index >= 0 ? index : 0;
  }

  private findImagesByIds(ids: number[]): ProductImage[] {
    if (!this.product) {
      return [];
    }

    const allImages = [
      ...this.product.defaultImages,
      ...Object.values(this.product.imagesByColor).flatMap((images) => images)
    ];

    return this.uniqueImages(allImages.filter((image) => ids.includes(image.id)));
  }

  private uniqueImages(images: ProductImage[]): ProductImage[] {
    const seen = new Set<number>();
    return images.filter((image) => {
      if (seen.has(image.id)) {
        return false;
      }

      seen.add(image.id);
      return true;
    });
  }

  private syncQuantity(): void {
    this.quantity = Math.max(1, Math.min(this.getMaxQuantity(), Math.round(this.quantity || 1)));
  }
}
