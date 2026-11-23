import { Component, OnInit, OnDestroy, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { flattenCategoryOptions } from '../../shared/category-options';

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
  attributeValueSelection: { attributeId: number; attributeValueId: number; attributeName: string; valueName: string }[];
  price: number;
  quantity: number;
}

interface ImageUpload {
  id?: string;
  file?: File;
  url?: string;
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
  categoryId: number;
  variants: Array<{
    price: number;
    attributeValueIds: { attributeValueId: number }[];
    quantity: number;
  }>;
  images: Array<{
    url: string;
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
  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  productForm!: FormGroup;
  activeTab = 'basic';
  isSubmitting = false;
  hasUnsavedChanges = false;
  successMessage = '';
  errorMessage = '';

  categoryOptions: { id: number; label: string }[] = [];
  attributes: Attribute[] = [];
  selectedAttributes: { [attributeId: number]: number } = {};

  variants: VariantRow[] = [];
  uploadedImages: ImageUpload[] = [];
  private pendingImages = 0;

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
      brand: ['', [Validators.required]],
      categoryId: ['', [Validators.required]],
      price: [null, [Validators.required, Validators.min(0)]]
    });
  }

  private loadBackendData(): void {
    forkJoin({
      categories: this.http.get<Category[]>(`${this.apiBaseUrl}/api/categories`),
      attributes: this.http.get<Attribute[]>(`${this.apiBaseUrl}/api/attributes/with-values`)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.categoryOptions = flattenCategoryOptions(data.categories);
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

    const basePrice = this.productForm.get('price')?.value || 0;

    const variant: VariantRow = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      attributeValueSelection,
      price: basePrice,
      quantity: 0
    };

    this.variants.push(variant);
    this.closeVariantModal();
    this.successMessage = '✓ Variante ajoutée';
    setTimeout(() => this.successMessage = '', 2000);
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
      if (this.uploadedImages.length + this.pendingImages >= 10) {
        this.errorMessage = 'Maximum 10 images autorisées';
        break;
      }

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        this.errorMessage = 'Formats autorisés: JPG, PNG';
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = 'Chaque image doit peser au maximum 10 Mo';
        continue;
      }

      const reader = new FileReader();
      this.pendingImages++;
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.pendingImages--;
        const base64 = e.target?.result as string;
        const image: ImageUpload = {
          id: Date.now().toString() + Math.random(),
          file,
          base64,
          url: base64,
          isMain: this.uploadedImages.length === 0,
          displayOrder: this.uploadedImages.length,
          visualAttributeValueId: undefined
        };
        this.uploadedImages.push(image);
      };
      reader.onerror = () => {
        this.pendingImages--;
        this.errorMessage = 'Impossible de lire cette image. Veuillez réessayer.';
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
    return this.productForm.valid && this.variants.length > 0 && this.uploadedImages.length > 0 && this.pendingImages === 0;
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
    if (this.currentStep === 1) {
      if (this.productForm.invalid) {
        this.productForm.markAllAsTouched();
        return;
      }
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      if (this.variants.length === 0) {
        this.errorMessage = 'Ajoutez au moins une variante pour continuer.';
        return;
      }
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      if (this.pendingImages > 0) {
        this.errorMessage = 'Patientez pendant la lecture des images.';
        return;
      }
      if (this.uploadedImages.length === 0) {
        this.errorMessage = 'Ajoutez au moins une image pour continuer.';
        return;
      }
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
      categoryId: this.productForm.get('categoryId')?.value,
      variants: this.variants.map(v => {
        return {
          price: v.price,
          attributeValueIds: v.attributeValueSelection.map(sel => ({ attributeValueId: sel.attributeValueId })),
          quantity: v.quantity
        };
      }),
      images: this.uploadedImages.map((img, index) => ({
        url: img.base64 || img.url || '',
        isMain: img.isMain,
        displayOrder: index,
        visualAttributeValueId: img.visualAttributeValueId
      }))
    };

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
