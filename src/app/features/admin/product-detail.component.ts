import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormRecord, NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
import { AdminProductService } from '../../core/admin-product.service';
import { resolveProductImageUrl } from '../../shared/product-image-url';
import { flattenCategoryOptions } from '../../shared/category-options';
import {
  AdminAttribute,
  ProductAdminDetailResponse,
  ProductImageDto,
  VariantAdminResponse
} from '../../models/admin-product.model';

type ProductLoadResult =
  | { product: ProductAdminDetailResponse; errorMessage: '' }
  | { product: null; errorMessage: string };
type Editor = 'product' | 'variant' | 'stock' | 'image' | null;

const imageFileValidator: ValidatorFn = (control) => {
  const file: File | null = control.value;
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return { imageType: true };
  if (file.size > 10 * 1024 * 1024) return { imageSize: true };
  return null;
};

@Component({
  selector: 'app-admin-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class AdminProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(AdminProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  product: ProductAdminDetailResponse | null = null;
  productId = 0;
  loading = false;
  busy = false;
  errorMessage = '';
  successMessage = '';
  editor: Editor = null;
  editingId: number | null = null;
  categories: { id: number; label: string }[] = [];
  attributes: AdminAttribute[] = [];
  selectedVariantIds = new Set<number>();
  imagePreview = '';
  private imagePreviewObjectUrl: string | null = null;
  readonly resolveProductImageUrl = resolveProductImageUrl;

  readonly productForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.pattern(/\S/)]],
    brand: [''],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]]
  });
  readonly variantForm = this.fb.group({
    price: [0, [Validators.required, Validators.min(0)]],
    quantity: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]]
  });
  readonly attributeControls = new FormRecord<FormControl<number | null>>({});
  readonly stockForm = this.fb.group({
    quantity: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]]
  });
  readonly imageForm = this.fb.group({
    mode: this.fb.control<'file' | 'url'>('file'),
    file: new FormControl<File | null>(null, [Validators.required, imageFileValidator]),
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/i)]],
    displayOrder: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    isMain: [false],
    visualAttributeValueId: this.fb.control<number | null>(null)
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.releaseImagePreview());
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => Number(params.get('id'))),
      distinctUntilChanged(),
      switchMap((id) => {
        this.productId = id;
        this.product = null;
        this.editor = null;
        this.releaseImagePreview();
        this.selectedVariantIds.clear();
        this.errorMessage = '';
        this.successMessage = '';

        if (!Number.isSafeInteger(id) || id <= 0) {
          this.loading = false;
          return of<ProductLoadResult>({ product: null, errorMessage: 'Identifiant de produit invalide.' });
        }

        this.loading = true;
        return this.service.getProductDetail(id).pipe(
          map((product): ProductLoadResult => ({ product, errorMessage: '' })),
          catchError((error: unknown) => of<ProductLoadResult>({
            product: null,
            errorMessage: this.describeError(error, 'Impossible de charger ce produit.')
          })),
          finalize(() => this.loading = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((result) => {
      this.product = result.product;
      this.errorMessage = result.errorMessage;
    });
  }

  get totalAvailableStock(): number {
    return this.product?.variants.reduce((total, variant) => total + (variant.stock?.availableQuantity ?? 0), 0) ?? 0;
  }

  get totalReservedStock(): number {
    return this.product?.variants.reduce((total, variant) => total + (variant.stock?.reservedQuantity ?? 0), 0) ?? 0;
  }

  get allVariantsSelected(): boolean {
    return !!this.product?.variants.length && this.product.variants.every((variant) => this.selectedVariantIds.has(variant.id));
  }

  get imageAttributeValues(): { id: number; label: string }[] {
    const values = new Map<number, string>();
    this.product?.variants.forEach((variant) => variant.attributeValues.forEach((attribute) => {
      values.set(attribute.attributeValueId, `${attribute.attributeName} : ${attribute.attributeValueName}`);
    }));
    this.product?.images.forEach((image) => {
      if (image.visualAttributeValueId != null && !values.has(image.visualAttributeValueId)) {
        values.set(image.visualAttributeValueId, image.visualAttributeValueName ?? `Valeur ${image.visualAttributeValueId}`);
      }
    });
    return Array.from(values, ([id, label]) => ({ id, label }));
  }

  get editingVariant(): VariantAdminResponse | undefined {
    return this.product?.variants.find((variant) => variant.id === this.editingId);
  }

  get hasUnsavedChanges(): boolean {
    switch (this.editor) {
      case 'product': return this.productForm.dirty;
      case 'variant': return this.variantForm.dirty || this.attributeControls.dirty;
      case 'stock': return this.stockForm.dirty;
      case 'image': return this.imageForm.dirty;
      default: return false;
    }
  }

  canLeave(): boolean {
    if (this.busy) {
      this.errorMessage = 'Veuillez attendre la fin de l’opération avant de quitter cette page.';
      return false;
    }
    return !this.hasUnsavedChanges || confirm('Vos modifications non enregistrées seront perdues. Quitter cette page ?');
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges || this.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  cancelEditor(): void {
    if (this.busy) return;
    if (this.hasUnsavedChanges && !confirm('Abandonner les modifications non enregistrées ?')) return;
    this.editor = null;
    this.editingId = null;
    this.releaseImagePreview();
    this.errorMessage = '';
  }

  editProduct(): void {
    if (!this.product || this.busy || this.editor) return;
    const product = this.product;
    this.errorMessage = '';
    this.busy = true;
    this.service.getCategories().pipe(
      finalize(() => this.busy = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (categories) => {
        this.categories = flattenCategoryOptions(categories);
        if (!this.categories.some((category) => category.id === product.categoryId)) {
          this.categories.unshift({ id: product.categoryId, label: product.categoryName });
        }
        this.productForm.reset({
          name: product.name, description: product.description, brand: product.brand,
          categoryId: product.categoryId, price: product.price
        });
        this.editor = 'product';
      },
      error: (error: unknown) => this.errorMessage = this.describeError(error, 'Impossible de charger les catégories.')
    });
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const values = this.productForm.getRawValue();
    this.mutate(this.service.updateProduct(this.productId, {
      ...values, name: values.name.trim(), description: values.description.trim(),
      brand: values.brand.trim()
    }), 'Informations du produit enregistrées.');
  }

  editVariant(variant?: VariantAdminResponse): void {
    if (!this.product || this.busy || this.editor) return;
    this.errorMessage = '';
    this.busy = true;
    this.service.getAttributes().pipe(
      finalize(() => this.busy = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (attributes) => {
        const missingValue = variant?.attributeValues.some((selected) => {
          const attribute = attributes.find((item) => item.id === selected.attributeId);
          return !attribute?.values.some((value) => value.id === selected.attributeValueId);
        });
        if (missingValue) {
          this.errorMessage = 'Certains attributs de cette variante sont introuvables. Rechargez les données avant de la modifier.';
          return;
        }
        this.attributes = attributes;
        for (const key of Object.keys(this.attributeControls.controls)) this.attributeControls.removeControl(key);
        for (const attribute of attributes) {
          const currentValue = variant?.attributeValues.find((value) => value.attributeId === attribute.id)?.attributeValueId ?? null;
          this.attributeControls.addControl(String(attribute.id), new FormControl<number | null>(currentValue));
        }
        this.attributeControls.markAsPristine();
        this.variantForm.reset({
          price: variant?.price ?? this.product?.price ?? 0,
          quantity: 0
        });
        this.editingId = variant?.id ?? null;
        this.editor = 'variant';
      },
      error: (error: unknown) => this.errorMessage = this.describeError(error, 'Impossible de charger les attributs.')
    });
  }

  saveVariant(): void {
    const values = this.variantForm.getRawValue();
    const attributeValueIds = Object.values(this.attributeControls.getRawValue())
      .filter((id): id is number => id !== null);
    if (this.variantForm.invalid || attributeValueIds.length === 0) {
      this.variantForm.markAllAsTouched();
      this.errorMessage = 'Renseignez le prix et au moins un attribut valide.';
      return;
    }
    const payload = { price: values.price, attributeValueIds };
    const request = this.editingId === null
      ? this.service.createVariant(this.productId, { ...payload, quantity: values.quantity })
      : this.service.updateVariant(this.productId, this.editingId, payload);
    this.mutate(request, this.editingId === null ? 'Variante ajoutée.' : 'Variante modifiée.');
  }

  editStock(variant: VariantAdminResponse): void {
    if (this.busy || this.editor || !variant.stock) return;
    this.editingId = variant.id;
    this.stockForm.reset({ quantity: variant.stock.quantity });
    this.stockForm.controls.quantity.setValidators([
      Validators.required, Validators.min(variant.stock.reservedQuantity), Validators.pattern(/^\d+$/)
    ]);
    this.stockForm.controls.quantity.updateValueAndValidity();
    this.editor = 'stock';
    this.errorMessage = '';
  }

  saveStock(): void {
    if (this.editingId === null) return;
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }
    this.mutate(
      this.service.updateStock(this.productId, this.editingId, this.stockForm.getRawValue().quantity),
      'Stock mis à jour.'
    );
  }

  toggleVariant(id: number, checked: boolean): void {
    if (checked) this.selectedVariantIds.add(id);
    else this.selectedVariantIds.delete(id);
  }

  toggleAllVariants(checked: boolean): void {
    this.selectedVariantIds.clear();
    if (checked) this.product?.variants.forEach((variant) => this.selectedVariantIds.add(variant.id));
  }

  deleteVariants(variants: VariantAdminResponse[]): void {
    if (!this.product || this.busy || this.editor || variants.length === 0) return;
    const names = variants.map((variant) => `• ${variant.sku}`).join('\n');
    if (!confirm(`Supprimer ${variants.length} variante(s) ? Cette action peut être irréversible.\n\n${names}`)) return;
    const request = variants.length === 1
      ? this.service.deleteVariant(this.productId, variants[0].id)
      : this.service.deleteVariants(this.productId, variants.map((variant) => variant.id));
    this.mutate(request, 'Variante(s) supprimée(s).');
  }

  deleteSelectedVariants(): void {
    this.deleteVariants(this.product?.variants.filter((variant) => this.selectedVariantIds.has(variant.id)) ?? []);
  }

  editImage(image?: ProductImageDto): void {
    if (!this.product || this.busy || this.editor) return;
    this.editingId = image?.id ?? null;
    this.releaseImagePreview();
    this.imagePreview = image ? resolveProductImageUrl(image.url) : '';
    this.imageForm.reset({
      mode: 'file',
      file: null,
      url: image?.url ?? '',
      displayOrder: image?.displayOrder ?? this.product.images.length,
      isMain: image?.main ?? this.product.images.length === 0,
      visualAttributeValueId: image?.visualAttributeValueId ?? null
    });
    if (image) {
      this.imageForm.controls.mode.disable();
      this.imageForm.controls.file.disable();
      this.imageForm.controls.url.disable();
    } else {
      this.imageForm.controls.mode.enable();
      this.imageForm.controls.file.enable();
      this.imageForm.controls.url.disable();
    }
    this.editor = 'image';
    this.errorMessage = '';
  }

  previewImage(): void {
    this.imagePreview = this.imageForm.controls.url.valid ? this.imageForm.controls.url.value.trim() : '';
  }

  changeImageMode(): void {
    this.releaseImagePreview();
    this.imageForm.controls.file.reset(null);
    this.imageForm.controls.url.reset('');
    if (this.imageForm.controls.mode.value === 'file') {
      this.imageForm.controls.url.disable();
      this.imageForm.controls.file.enable();
    } else {
      this.imageForm.controls.file.disable();
      this.imageForm.controls.url.enable();
    }
    this.imageForm.markAsDirty();
  }

  onImageFileSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.item(0) ?? null;
    this.releaseImagePreview();
    this.imageForm.controls.file.setValue(file);
    this.imageForm.controls.file.markAsDirty();
    this.imageForm.controls.file.markAsTouched();
    if (file && this.imageForm.controls.file.valid) {
      this.imagePreviewObjectUrl = URL.createObjectURL(file);
      this.imagePreview = this.imagePreviewObjectUrl;
    } else {
      input.value = '';
    }
  }

  saveImage(): void {
    if (this.imageForm.invalid) {
      this.imageForm.markAllAsTouched();
      return;
    }
    const values = this.imageForm.getRawValue();
    if (this.editingId !== null && this.product?.images.find((image) => image.id === this.editingId)?.main && !values.isMain) {
      this.errorMessage = 'Choisissez d’abord une autre image principale.';
      return;
    }
    const metadata = {
      displayOrder: values.displayOrder,
      isMain: values.isMain,
      visualAttributeValueId: values.visualAttributeValueId ?? (this.editingId === null ? null : -1)
    };
    let request: Observable<unknown>;
    if (this.editingId === null) {
      const createMetadata = { ...metadata, visualAttributeValueId: values.visualAttributeValueId ?? undefined };
      if (values.mode === 'file') {
        if (!values.file) {
          this.errorMessage = 'Sélectionnez un fichier image.';
          return;
        }
        request = this.service.createImage(this.productId, { ...createMetadata, file: values.file });
      } else {
        request = this.service.createImage(this.productId, { ...createMetadata, url: values.url.trim() });
      }
    } else {
      request = this.service.updateImage(this.productId, this.editingId, metadata);
    }
    this.mutate(request, this.editingId === null ? 'Image ajoutée.' : 'Image modifiée.');
  }

  setMainImage(image: ProductImageDto): void {
    if (this.busy || this.editor || image.main) return;
    this.mutate(this.service.updateImage(this.productId, image.id, { isMain: true }), 'Image principale mise à jour.');
  }

  deleteImage(image: ProductImageDto): void {
    if (!this.product || this.busy || this.editor) return;
    if (image.main) {
      this.errorMessage = this.product.images.length === 1
        ? 'La seule image principale ne peut pas être supprimée.'
        : 'Choisissez une autre image principale avant de supprimer celle-ci.';
      return;
    }
    if (!confirm(`Supprimer l’image « ${image.alt || 'sans description'} » ? Cette action peut être irréversible.`)) return;
    this.mutate(this.service.deleteImage(this.productId, image.id), 'Image supprimée.');
  }

  archiveProduct(): void {
    if (!this.product || this.busy || this.editor || this.product.status === 'ARCHIVED') return;
    if (!confirm(`Archiver « ${this.product.name} » ? Le produit pourrait ne plus être visible dans le catalogue.`)) return;
    this.mutate(this.service.archiveProduct(this.productId), 'Produit archivé.');
  }

  retryLoad(): void {
    if (!Number.isSafeInteger(this.productId) || this.productId <= 0 || this.busy) return;
    this.loading = true;
    this.errorMessage = '';
    this.service.getProductDetail(this.productId).pipe(
      finalize(() => this.loading = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (product) => this.product = product,
      error: (error: unknown) => this.errorMessage = this.describeError(error, 'Impossible de charger ce produit.')
    });
  }

  private mutate(request: Observable<unknown>, successMessage: string): void {
    if (this.busy) return;
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.releaseImagePreview();
        this.editor = null;
        this.editingId = null;
        this.selectedVariantIds.clear();
        this.successMessage = successMessage;
        // A successful write is followed by a fresh GET; do not assume the server returned a complete product.
        this.service.getProductDetail(this.productId).pipe(
          finalize(() => this.busy = false),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: (product) => this.product = product,
          error: (error: unknown) => {
            this.product = null;
            this.errorMessage = this.describeError(error, 'Modification enregistrée, mais impossible de recharger le produit.');
          }
        });
      },
      error: (error: unknown) => {
        this.busy = false;
        this.errorMessage = this.describeError(error, 'L’opération a échoué. Veuillez réessayer.');
      }
    });
  }

  private releaseImagePreview(): void {
    if (this.imagePreviewObjectUrl) {
      URL.revokeObjectURL(this.imagePreviewObjectUrl);
      this.imagePreviewObjectUrl = null;
    }
    this.imagePreview = '';
  }

  private describeError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return `${fallback} Le serveur est inaccessible.`;
    if (error.status === 401) return `${fallback} Veuillez vous reconnecter.`;
    if (error.status === 403) return `${fallback} Accès administrateur refusé.`;
    if (error.error && typeof error.error === 'object' && typeof error.error.message === 'string') {
      return `${fallback} ${error.error.message}`;
    }
    return `${fallback} (HTTP ${error.status})`;
  }
}
