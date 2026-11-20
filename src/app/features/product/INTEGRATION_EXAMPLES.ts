/**
 * Exemple d'intégration complète de la page Add Product
 * À adapter selon votre structure de routing
 */

// ============================================
// EXEMPLE 1: Dans app.routes.ts
// ============================================

import { Routes } from '@angular/router';
import { AddProductComponent } from './features/product/add-product.component';

export const appRoutes: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: 'products',
        children: [
          {
            path: 'add',
            component: AddProductComponent,
            data: { title: 'Ajouter un produit' }
          },
          {
            path: ':id',
            component: ProductDetailComponent // Votre composant de détail
          }
        ]
      }
    ]
  }
];

// ============================================
// EXEMPLE 2: Dans un composant admin/list
// ============================================

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-products-admin',
  template: `
    <div class="products-admin">
      <button (click)="goToAddProduct()">
        <mat-icon>add</mat-icon>
        Ajouter un produit
      </button>
      <!-- Liste des produits... -->
    </div>
  `
})
export class ProductsAdminComponent {
  private router = inject(Router);

  goToAddProduct(): void {
    this.router.navigate(['/admin/products/add']);
  }
}

// ============================================
// EXEMPLE 3: Configuration Module Material
// ============================================

import { NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    DragDropModule
  ]
})
export class MaterialModule { }

// ============================================
// EXEMPLE 4: Interceptor pour l'API
// ============================================

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ProductApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Ajouter un header personnalisé si besoin
    if (req.url.includes('/api/products')) {
      req = req.clone({
        setHeaders: {
          'Content-Type': 'application/json',
          'X-API-Version': 'v1'
        }
      });
    }
    return next.handle(req);
  }
}

// ============================================
// EXEMPLE 5: Utilisation du FileValidationService
// ============================================

import { Component, inject } from '@angular/core';
import { FileValidationService } from '../core/file-validation.service';

@Component({
  selector: 'app-custom-upload',
  template: `
    <input (change)="onFileSelected($event)" type="file" multiple accept="image/*">
  `
})
export class CustomUploadComponent {
  private fileValidationService = inject(FileValidationService);

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    for (const file of Array.from(input.files)) {
      // Valider le fichier
      const validation = this.fileValidationService.validateImageFile(file);
      
      if (!validation.valid) {
        console.error(validation.error);
        continue;
      }

      // Convertir en base64
      const base64 = await this.fileValidationService.fileToBase64(file);
      console.log('Image prête:', base64);

      // Ou compresser si nécessaire
      // const compressed = await this.fileValidationService.compressImage(file);
    }
  }
}

// ============================================
// EXEMPLE 6: Mock de test
// ============================================

import { TestBed } from '@angular/core/testing';
import { AddProductComponent } from './add-product.component';
import { ProductService } from '../core/product.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

describe('AddProductComponent Integration', () => {
  let component: AddProductComponent;
  let productService: jasmine.SpyObj<ProductService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const productServiceSpy = jasmine.createSpyObj('ProductService', ['createProduct']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    productService = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should submit form successfully', (done) => {
    const mockResponse = {
      id: '123',
      name: 'Test Product',
      price: 99.99,
      brand: 'Test Brand'
    };

    productService.createProduct.and.returnValue(of(mockResponse));

    component.productForm.patchValue({
      name: 'Test Product',
      brand: 'Test Brand',
      price: 99.99,
      stock: 10
    });

    component.submitForm();

    setTimeout(() => {
      expect(productService.createProduct).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/products', '123']);
      expect(snackBar.open).toHaveBeenCalled();
      done();
    }, 100);
  });
});

// ============================================
// EXEMPLE 7: Env configuration
// ============================================

// environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  
  // Configuration pour les produits
  product: {
    maxImages: 10,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    autoSaveInterval: 30000, // 30 secondes
    maxNameLength: 150,
    maxDescriptionLength: 1000
  }
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.example.com',
  
  product: {
    maxImages: 10,
    maxImageSize: 5 * 1024 * 1024,
    autoSaveInterval: 30000,
    maxNameLength: 150,
    maxDescriptionLength: 1000
  }
};

// ============================================
// EXEMPLE 8: Utilisation dans un layout
// ============================================

@Component({
  selector: 'app-admin-layout',
  template: `
    <div class="admin-layout">
      <app-header></app-header>
      <div class="admin-content">
        <app-sidebar></app-sidebar>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .admin-content {
      display: flex;
      flex: 1;
    }
    
    .main-content {
      flex: 1;
      overflow-y: auto;
    }
  `]
})
export class AdminLayoutComponent { }
