import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';

import { ProductService } from '../../core/product.service';
import { ProductCard } from '../../models/catalogResponse.model';
import { ProductPriceDisplayComponent } from '../../shared/pricing/product-price-display.component';
import { resolveProductImageUrl } from '../../shared/product-image-url';
import { StoreSettingsService } from '../../core/store-settings.service';
import { Category, MenuService } from '../../core/menu.service';
import { EMPTY, catchError, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductPriceDisplayComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  readonly store = inject(StoreSettingsService);
  private readonly productService = inject(ProductService);
  private readonly menuService = inject(MenuService);
  private readonly destroyRef = inject(DestroyRef);

  products: ProductCard[] = [];
  categories: Category[] = [];
  categoriesLoading = true;
  categoriesError = false;
  loading = true;
  loadError = false;
  brokenImages = new Set<number>();

  ngOnInit(): void {
    this.loadCatalog();
    this.menuService.changes$.pipe(
      startWith(undefined),
      switchMap(() => {
        this.categoriesLoading = true;
        return this.menuService.getMenu().pipe(catchError(error => {
          console.error('Could not load categories', error);
          this.categoriesLoading = false;
          this.categoriesError = true;
          return EMPTY;
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(categories => {
      this.categories = categories;
      this.categoriesLoading = false;
      this.categoriesError = false;
    });
  }

  loadCatalog(): void {
    this.loading = true;
    this.loadError = false;
    this.productService.getCatalog({ page: 0, size: 8 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalog) => {
          this.products = catalog.products;
          this.brokenImages.clear();
          this.loading = false;
        },
        error: (error) => {
          console.error('Impossible de charger le catalogue sur la page d’accueil', error);
          this.loadError = true;
          this.loading = false;
        }
      });
  }

  reloadCategories(): void {
    this.menuService.refresh();
  }

  imageUrl(product: ProductCard): string | null {
    return product.imageUrl && !this.brokenImages.has(product.id)
      ? resolveProductImageUrl(product.imageUrl)
      : null;
  }
}
