import { Component, OnInit, OnDestroy, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { Subject, takeUntil, forkJoin } from 'rxjs';

/**
 * Interfaces pour les données du backend
 */
interface Category {
  id: number;
  name: string;
  parent?: Category | null;
  children?: Category[];
}

interface AttributeValue {
  id: number;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Attribute {
  id: number;
  name: string;
  values: AttributeValue[];
  createdAt?: string;
  updatedAt?: string;
}

interface VariantRow {
  id?: string;
  sku: string;
  attributeValueSelection: { attributeId: number; attributeValueId: number; attributeName: string; valueName: string }[];
  price: number;
  quantity: number;
}

interface ImageUpload {
  id?: string;
  file?: File;
  url?: string;
  alt: string;
  isMain: boolean;
  displayOrder: number;
  visualAttributeValueId?: number;
  base64?: string;
}

interface ProductCreatePayload {
  name: string;
  description: string;
  price: number;
  brand: string;
  slug: string;
  categoryId: number;
  variants: Array<{
    sku: string;
    price: number;
    attributeValueIds: number[];
    quantity: number;
  }>;
  images: Array<{
    url: string;
    alt: string;
    isMain: boolean;
    displayOrder: number;
    visualAttributeValueId?: number;
  }>;
}

/**
 * Composant pour ajouter un produit avec support complet des variantes et attributs
 */
@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css']
})
export class AddProductComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;

  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private destroy$ = new Subject<void>();
  private readonly apiBaseUrl = environment.apiBaseUrl || 'http://localhost:8080';

  productForm!: FormGroup;
  activeTab = 'basic';
  isSubmitting = false;
  hasUnsavedChanges = false;
  successMessage = '';
  errorMessage = '';

  categories: Category[] = [];
  attributes: Attribute[] = [];
  selectedAttributes: { [attributeId: number]: number } = {};

  variants: VariantRow[] = [];
  uploadedImages: ImageUpload[] = [];

  showVariantModal = false;
  isLoadingData = true;
  currentStep = 1;

  ngOnInit(): void {
    this.initializeForm();
    this.loadBackendData();
  }

  private initializeForm(): void {
    this.productForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      brand: [''],
      categoryId: ['', [Validators.required]],
      price: [null, [Validators.required, Validators.min(0)]],
      slug: ['', [Validators.required]]
    });

    this.productForm.get('name')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(name => {
        const slug = this.generateSlug(name);
        this.productForm.patchValue({ slug }, { emitEvent: false });
      });
  }

  private loadBackendData(): void {
    forkJoin({
      categories: this.http.get<Category[]>(`${this.apiBaseUrl}/api/categories`),
      attributes: this.http.get<Attribute[]>(`${this.apiBaseUrl}/api/attributes/with-values`)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.categories = data.categories;
          this.attributes = data.attributes;
          this.isLoadingData = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors du chargement des données';
          console.error('Erreur:', error);
          this.isLoadingData = false;
        }
      });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  private generateSlug(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[àâäæ]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìîï]/g, 'i')
      .replace(/[òôöœ]/g, 'o')
      .replace(/[ùûüµ]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  openVariantModal(): void {
    this.selectedAttributes = {};
    this.showVariantModal = true;
  }

  closeVariantModal(): void {
    this.showVariantModal = false;
    this.selectedAttributes = {};
  }

  selectAttributeValue(attributeId: number, valueId: number): void {
    this.selectedAttributes[attributeId] = valueId;
  }

  createVariant(): void {
    const attributeIds = Object.keys(this.selectedAttributes).map(Number);
    
    if (attributeIds.length === 0) {
      this.errorMessage = 'Sélectionnez au moins un attribut';
      return;
    }

    // Construire la sélection complète avec IDs et noms
    const attributeValueSelection = attributeIds.map(attrId => {
      const attribute = this.attributes.find(a => a.id === attrId);
      const valueId = this.selectedAttributes[attrId];
      const attributeValue = attribute?.values.find(v => v.id === valueId);
      
      if (!attribute || !attributeValue) {
        throw new Error(`Attribut ou valeur introuvable pour l'ID ${attrId}`);
      }

      return {
        attributeId: attrId,
        attributeValueId: valueId,
        attributeName: attribute.name,
        valueName: attributeValue.value
      };
    });

    // Vérifier si cette combinaison existe déjà
    if (this.variants.some(v => 
      JSON.stringify(v.attributeValueSelection.sort((a, b) => a.attributeId - b.attributeId)) === 
      JSON.stringify(attributeValueSelection.sort((a, b) => a.attributeId - b.attributeId))
    )) {
      this.errorMessage = 'Cette combinaison de variante existe déjà';
      return;
    }

    const sku = this.generateSKU(attributeValueSelection);
    const basePrice = this.productForm.get('price')?.value || 0;

    const variant: VariantRow = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      sku,
      attributeValueSelection,
      price: basePrice,
      quantity: 0
    };

    this.variants.push(variant);
    this.closeVariantModal();
    this.successMessage = '✓ Variante ajoutée';
    setTimeout(() => this.successMessage = '', 2000);
  }

  private generateSKU(attributeValueSelection: { attributeId: number; attributeValueId: number; attributeName: string; valueName: string }[]): string {
    const name = this.productForm.get('name')?.value || 'PROD';
    const prefix = name.substring(0, 3).toUpperCase();
    const attrs = attributeValueSelection
      .sort((a, b) => a.attributeName.localeCompare(b.attributeName))
      .map(c => c.valueName.substring(0, 1).toUpperCase())
      .join('-');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${attrs}-${random}`;
  }

  removeVariant(id: string): void {
    if (confirm('Supprimer cette variante ?')) {
      this.variants = this.variants.filter(v => v.id !== id);
    }
  }

  updateVariantPrice(id: string, newPrice: number): void {
    const variant = this.variants.find(v => v.id === id);
    if (variant) variant.price = newPrice;
  }

  updateVariantQuantity(id: string, newQuantity: number): void {
    const variant = this.variants.find(v => v.id === id);
    if (variant) variant.quantity = newQuantity;
  }

  get totalStock(): number {
    return this.variants.reduce((sum, v) => sum + v.quantity, 0);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

    for (let file of Array.from(files)) {
      if (this.uploadedImages.length >= 10) {
        this.errorMessage = 'Maximum 10 images autorisées';
        break;
      }

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        this.errorMessage = 'Formats autorisés: JPG, PNG';
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const base64 = e.target?.result as string;
        const image: ImageUpload = {
          id: Date.now().toString() + Math.random(),
          file,
          base64,
          url: base64,
          alt: '',
          isMain: this.uploadedImages.length === 0,
          displayOrder: this.uploadedImages.length,
          visualAttributeValueId: undefined
        };
        this.uploadedImages.push(image);
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  setMainImage(id: string | undefined): void {
    this.uploadedImages.forEach(img => img.isMain = img.id === id);
  }

  removeImage(id: string | undefined): void {
    this.uploadedImages = this.uploadedImages.filter(img => img.id !== id);
    
    this.uploadedImages.forEach((img, index) => {
      img.displayOrder = index;
      if (index === 0 && !this.uploadedImages.some(i => i.isMain)) {
        img.isMain = true;
      }
    });
  }

  updateImageAttribute(id: string | undefined, attributeValueId: number): void {
    const image = this.uploadedImages.find(img => img.id === id);
    if (image) {
      image.visualAttributeValueId = attributeValueId === 0 ? undefined : attributeValueId;
    }
  }

  get isFormComplete(): boolean {
    return this.productForm.valid && this.variants.length > 0 && this.uploadedImages.length > 0;
  }

  get totalAvailableStock(): number {
    return this.variants.reduce((sum, v) => sum + v.quantity, 0);
  }

  get allImagesHaveAlt(): boolean {
    return true;
  }

  get completedSections(): number {
    let completed = 0;
    if (this.productForm.valid) completed++;
    if (this.variants.length > 0) completed++;
    if (this.uploadedImages.length > 0) completed++;
    if (this.isFormComplete) completed++;
    return completed;
  }

  get availableVisualAttributes(): AttributeValue[] {
    const usedValueIds = new Set<number>();
    
    this.variants.forEach(variant => {
      variant.attributeValueSelection.forEach(selection => {
        usedValueIds.add(selection.attributeValueId);
      });
    });

    const result: AttributeValue[] = [];
    this.attributes.forEach(attr => {
      attr.values.forEach(value => {
        if (usedValueIds.has(value.id)) {
          result.push(value);
        }
      });
    });

    return result.sort((a, b) => a.value.localeCompare(b.value));
  }

  getVisualAttributesByVariants(): Attribute[] {
    if (this.variants.length === 0) {
      return [];
    }

    const usedValueIds = new Set<number>();
    this.variants.forEach(variant => {
      variant.attributeValueSelection.forEach(selection => {
        usedValueIds.add(selection.attributeValueId);
      });
    });

    const result: Attribute[] = [];
    this.attributes.forEach(attr => {
      const filteredValues = attr.values.filter(v => usedValueIds.has(v.id));
      if (filteredValues.length > 0) {
        result.push({
          ...attr,
          values: filteredValues
        });
      }
    });

    return result;
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.productForm.valid) {
      this.currentStep = 2;
    } else if (this.currentStep === 2 && this.variants.length > 0) {
      this.currentStep = 3;
    } else if (this.currentStep === 3 && this.uploadedImages.length > 0) {
      this.currentStep = 4;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitForm(): void {
    if (!this.isFormComplete) {
      this.errorMessage = 'Veuillez remplir toutes les sections obligatoires';
      return;
    }

    this.isSubmitting = true;

    const payload: ProductCreatePayload = {
      name: this.productForm.get('name')?.value || '',
      description: this.productForm.get('description')?.value || '',
      price: this.productForm.get('price')?.value,
      brand: this.productForm.get('brand')?.value || '',
      slug: this.productForm.get('slug')?.value || '',
      categoryId: this.productForm.get('categoryId')?.value,
      variants: this.variants.map(v => {
        return {
          sku: v.sku,
          price: v.price,
          attributeValueIds: v.attributeValueSelection.map(sel => sel.attributeValueId),
          quantity: v.quantity
        };
      }),
      images: this.uploadedImages.map((img, index) => ({
        url: img.base64 || img.url || '',
        alt: img.alt || '',
        isMain: img.isMain,
        displayOrder: index,
        visualAttributeValueId: img.visualAttributeValueId
      }))
    };
    console.log(payload);

    this.http.post(`${this.apiBaseUrl}/api/products`, payload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.successMessage = '✅ Produit créé avec succès!';
        setTimeout(() => {
          this.router.navigate(['/admin/products']);
        }, 1500);
      },
      error: (error) => {
        console.error(error);
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Erreur lors de la création du produit';
      }
    });
  }

  onCancel(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('Vous avez des changements non sauvegardés. Voulez-vous vraiment quitter?')) {
        this.router.navigate(['/admin/products']);
      }
    } else {
      this.router.navigate(['/admin/products']);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
