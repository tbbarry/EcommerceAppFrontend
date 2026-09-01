import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CatalogSearchParams, ProductService } from '../../core/product.service';
import { CategoryNode, Facet, FacetValue, ProductCard } from '../../models/catalogResponse.model';


interface ProductItem {
  id: number;
  name: string;
  slug: string;
  brand?: string;
  price: number;
  categoryName: string;
  categoryId: number;
  defaultImageUrl?: string;
  defaultImageAlt?: string;
  categories: string[];
  availableColors: string[];
  availableSizes: string[];
  inStock: boolean;
}

interface FacetItem {
  value: string;
  count: number;
}

interface CategoryTreeNode extends FacetItem {
  subCategories: CategoryTreeNode[];
}

interface PaginationInfo {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

interface CatalogResponse {
  items: ProductItem[];
  facets: {
    categories: FacetItem[];
    categoryTree?: CategoryTreeNode[];
    colors: FacetItem[];
    sizes: FacetItem[];
  };
  pagination: PaginationInfo;
  appliedFilters: {
    query: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    categories: string[];
    colors: string[];
    sizes: string[];
  };
  sort: string;
  availableSorts: string[];
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
toggleFacet2(arg0: string,arg1: any) {
throw new Error('Method not implemented.');
}
  products: ProductItem[] = [];
  products2: ProductCard[] = [];
  selectedFacetValues: Map<number, number[]> = new Map();
  facets: Facet[] = [];
  categories: FacetItem[] = [];
  categoryTree: CategoryTreeNode[] = [];
  categories2: CategoryNode[] = [];
  colors: FacetItem[] = [];
  sizes: FacetItem[] = [];
  availableSorts: string[] = [];
  pagination: PaginationInfo = { page: 0, size: 24, totalItems: 0, totalPages: 1, hasNext: false };
  isLoading = false;
  selectedCategories: string[] = [];
  selectedColors: string[] = [];
  selectedSizes: string[] = [];
  selectedSort = 'relevance';
  selectedPage = 0;
  pageSize = 24;
  pageSizeOptions = [12, 24, 48, 96];
  isMobileFiltersOpen = false;
  priceSliderMin = 0;
  priceSliderMax = 500;
  minPriceValue = 0;
  maxPriceValue = 500;
  selectedCategoryId: number | null = null;
  expandedCategories = new Set<number>();
  feedbackProductId: number | null = null;
  isCatalogImageViewerOpen = false;
  catalogViewerImageUrl = '';
  catalogViewerImageAlt = '';
  expandedCategoryBranches = new Set<string>();
  private feedbackResetHandle: ReturnType<typeof setTimeout> | null = null;

  searchForm = new FormGroup({
    query: new FormControl(''),
    minPrice: new FormControl<number | null>(null),
    maxPrice: new FormControl<number | null>(null)
  });

  readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  catalogSearchParams: CatalogSearchParams = {};

  constructor(private http: HttpClient) {}

 ngOnInit(): void {
  this.route.queryParams.subscribe(params => {

    this.selectedCategoryId = params['categoryId']
      ? Number(params['categoryId'])
      : null;

    this.selectedFacetValues.clear();

    if (params['facets']) {
      const facetGroups = params['facets'].split(';');

      for (const group of facetGroups) {
        const [facetId, values] = group.split(':');

        if (!facetId || !values) {
          continue;
        }

        this.selectedFacetValues.set(
          Number(facetId),
          values.split(',').map(Number)
        );
      }
    }

    this.selectedPage = params['page']
      ? Number(params['page'])
      : 0;

    this.pageSize = params['size']
      ? Number(params['size'])
      : 24;

    this.loadCatalog();
  });
}
  loadCatalog(): void {

    this.catalogSearchParams = this.buildSearchParams();
    console.log(this.catalogSearchParams);

    this.productService.getCatalog(this.catalogSearchParams).subscribe({
      next: (response) => {
        console.log('Catalog response:', response);
        this.products2 = response.products || [];
        this.categories2 = response.categories || [];
        console.log('Categories2:', this.categories2);
        console.log('Products2:', this.products2);
        this.facets = response.facets || [];
        console.log('Facets:', this.facets);
      },
      error: (e) => {

        console.log(e);
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  loadProducts(): void {
    this.isLoading = true;

    let params = new HttpParams()
      .set('page', this.selectedPage.toString())
      .set('size', this.pageSize.toString())
      .set('sort', this.selectedSort);

    const queryValue = this.searchForm.value.query?.toString().trim() || '';
    if (queryValue) {
      params = params.set('query', queryValue);
    }

    if (this.searchForm.value.minPrice != null) {
      params = params.set('minPrice', this.searchForm.value.minPrice!.toString());
    }

    if (this.searchForm.value.maxPrice != null) {
      params = params.set('maxPrice', this.searchForm.value.maxPrice!.toString());
    }

    this.selectedCategories.forEach((category) => {
      params = params.append('categories', category);
    });
    this.selectedColors.forEach((color) => {
      params = params.append('colors', color);
    });
    this.selectedSizes.forEach((size) => {
      params = params.append('sizes', size);
    });

    const baseUrl = (environment as { apiBaseUrl?: string }).apiBaseUrl || '';
    this.http.get<CatalogResponse>(`${baseUrl}/api/catalog/products`, { params }).subscribe({
      next: (response) => {
        this.products = response.items || [];
        this.categories = response.facets?.categories || [];
        this.categoryTree = this.normalizeCategoryTree(response.facets?.categoryTree, this.categories);
        this.syncCategoryBranchState();
        this.colors = response.facets?.colors || [];
        this.sizes = response.facets?.sizes || [];
        this.syncPriceFromAppliedFilters(response.appliedFilters?.minPrice, response.appliedFilters?.maxPrice);
        this.pagination = response.pagination || { page: 0, size: 24, totalItems: 0, totalPages: 1, hasNext: false };
        this.availableSorts = response.availableSorts || [];
        this.selectedSort = response.sort || this.selectedSort;
        this.isLoading = false;
      },
      error: (e) => {
        this.products = [];  
        this.isLoading = false;
        console.log(e)
      }
    });
  }

  applyFilters(): void {
    this.selectedPage = 0;
    this.selectedPage = 0;

    const params = this.buildSearchParams();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: ''
    });

      this.loadCatalog()
    }

  clearFilters(): void {
    this.selectedCategories = [];
    this.selectedColors = [];
    this.selectedSizes = [];
    this.selectedSort = 'relevance';
    this.selectedPage = 0;
    this.searchForm.reset({ query: '', minPrice: null, maxPrice: null });
    this.minPriceValue = this.priceSliderMin;
    this.maxPriceValue = this.priceSliderMax;
    this.loadProducts();
  }

  applyFiltersFromMobilePanel(): void {
    this.applyFilters();
    this.closeMobileFilters();
  }

  clearFiltersFromMobilePanel(): void {
    this.clearFilters();
    this.closeMobileFilters();
  }

  toggleMobileFilters(): void {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }

  closeMobileFilters(): void {
    this.isMobileFiltersOpen = false;
  }

  onMinPriceInputChange(value: string): void {
    const parsed = Number(value);
    this.minPriceValue = Math.min(this.clampPriceValue(Number.isFinite(parsed) ? parsed : this.priceSliderMin), this.maxPriceValue);
    this.syncAndApplyPriceIfNeeded();
  }

  onMaxPriceInputChange(value: string): void {
    const parsed = Number(value);
    this.maxPriceValue = Math.max(this.clampPriceValue(Number.isFinite(parsed) ? parsed : this.priceSliderMax), this.minPriceValue);
    this.syncAndApplyPriceIfNeeded();
  }

  toggleCategory(category: string): void {
    this.toggleSelection(this.selectedCategories, category);
    if (!this.isMobileViewport()) {
      this.applyFilters();
    }
  }

  toggleCategoryBranch1(category: string): void {
    if (this.expandedCategoryBranches.has(category)) {
      this.expandedCategoryBranches.delete(category);
      return;
    }

    this.expandedCategoryBranches.add(category);
  }

  isCategoryBranchOpen2(category: string): boolean {
    return this.expandedCategoryBranches.has(category);
  }

  toggleColor(color: string): void {
    this.toggleSelection(this.selectedColors, color);
    if (!this.isMobileViewport()) {
      this.applyFilters();
    }
  }

  toggleSize(size: string): void {
    this.toggleSelection(this.selectedSizes, size);
    if (!this.isMobileViewport()) {
      this.applyFilters();
    }
  }

  isSelected(values: string[], value: string): boolean {
    return values.includes(value);
  }

  toggleSelection(values: string[], value: string): void {
    if (values.includes(value)) {
      const index = values.indexOf(value);
      values.splice(index, 1);
    } else {
      values.push(value);
    }
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.pagination.totalPages) {
      return;
    }
    this.selectedPage = page;
    this.loadProducts();
  }



toggleFacetValue(facet: Facet, value: FacetValue): void {

  // Inverse l'état
  value.selected = !value.selected;

  // Reconstruit la Map à partir des valeurs sélectionnées
  const selectedIds = facet.values
    .filter(v => v.selected)
    .map(v => v.id);

  if (selectedIds.length === 0) {
    this.selectedFacetValues.delete(facet.id);
  } else {
    this.selectedFacetValues.set(facet.id, selectedIds);
  }

  if (!this.isMobileViewport()) {
    this.applyFilters();
  }
  console.log('Selected Facet Values:', this.selectedFacetValues);
}

isFacetValueSelected(facetId: number, valueId: number): boolean {
  return this.selectedFacetValues.get(facetId)?.includes(valueId) ?? false;
}

  pageRange(): number[] {
    const totalPages = Math.max(this.pagination.totalPages, 1);
    const pages: number[] = [];
    const start = Math.max(0, this.selectedPage - 2);
    const end = Math.min(totalPages - 1, this.selectedPage + 2);
    for (let index = start; index <= end; index++) {
      pages.push(index);
    }
    return pages;
  }

  hasActiveFilters(): boolean {
    return this.selectedCategories.length > 0 || this.selectedColors.length > 0 || this.selectedSizes.length > 0 || !!this.searchForm.value.query || this.searchForm.value.minPrice != null || this.searchForm.value.maxPrice != null;
  }

  getActiveFilterTags(): string[] {
    const tags: string[] = [];
    this.selectedCategories.forEach((category) => tags.push(`Category: ${category}`));
    this.selectedColors.forEach((color) => tags.push(`Color: ${color}`));
    this.selectedSizes.forEach((size) => tags.push(`Size: ${size}`));
    if (this.searchForm.value.query) {
      tags.push(`Search: ${this.searchForm.value.query}`);
    }
    if (this.searchForm.value.minPrice != null) {
      tags.push(`Min: $${this.searchForm.value.minPrice}`);
    }
    if (this.searchForm.value.maxPrice != null) {
      tags.push(`Max: $${this.searchForm.value.maxPrice}`);
    }
    return tags;
  }

  getProductImage(product: ProductItem, index: number): string {
    if (product.defaultImageUrl) {
      return product.defaultImageUrl;
    }

    const fallbackImages = [
      'assets/img/product/product-f-1.webp',
      'assets/img/product/product-m-1.webp',
      'assets/img/product/product-f-3.webp',
      'assets/img/product/product-m-3.webp',
      'assets/img/product/product-f-5.webp',
      'assets/img/product/product-m-5.webp'
    ];

    return fallbackImages[index % fallbackImages.length];
  }

   getProductImage2(product: ProductCard, index: number): string {
    if (product.imageUrl) {
      return product.imageUrl;
    }

    const fallbackImages = [
      'assets/img/product/product-f-1.webp',
      'assets/img/product/product-m-1.webp',
      'assets/img/product/product-f-3.webp',
      'assets/img/product/product-m-3.webp',
      'assets/img/product/product-f-5.webp',
      'assets/img/product/product-m-5.webp'
    ];

    return fallbackImages[index % fallbackImages.length];
  }

  formatSortLabel(sort: string): string {
    const labels: Record<string, string> = {
      relevance: 'Relevance',
      newest: 'Newest',
      priceAsc: 'Price: Low to High',
      priceDesc: 'Price: High to Low',
      nameAsc: 'Name A-Z',
      nameDesc: 'Name Z-A'
    };
    return labels[sort] || sort;
  }

  triggerImageFeedback(productId: number): void {
    this.feedbackProductId = productId;

    if (this.feedbackResetHandle) {
      clearTimeout(this.feedbackResetHandle);
    }

    this.feedbackResetHandle = setTimeout(() => {
      this.feedbackProductId = null;
      this.feedbackResetHandle = null;
    }, 260);
  }

  hasImageFeedback(productId: number): boolean {
    return this.feedbackProductId === productId;
  }

  openCatalogImageViewer(product: ProductItem, index: number): void {
    this.triggerImageFeedback(product.id);
    this.catalogViewerImageUrl = this.getProductImage(product, index);
    this.catalogViewerImageAlt = product.defaultImageAlt || product.name;
    this.isCatalogImageViewerOpen = true;
    this.lockBodyScroll();
  }

  openCatalogImageViewer2(product: ProductCard, index: number): void {
    this.triggerImageFeedback(product.id);
    this.catalogViewerImageUrl = this.getProductImage2(product, index);
    this.catalogViewerImageAlt = product.name;
    this.isCatalogImageViewerOpen = true;
    this.lockBodyScroll();
  }
  closeCatalogImageViewer(): void {
    this.isCatalogImageViewerOpen = false;
    this.unlockBodyScroll();
  }

  private normalizeCategoryTree(tree: CategoryTreeNode[] | undefined, flatCategories: FacetItem[]): CategoryTreeNode[] {
    if (tree && tree.length) {
      return tree;
    }

    return flatCategories.map((category) => ({
      value: category.value,
      count: category.count,
      subCategories: []
    }));
  }

  private syncCategoryBranchState(): void {
    const parentValues = this.categoryTree.map((node) => node.value);

    this.expandedCategoryBranches.forEach((value) => {
      if (!parentValues.includes(value)) {
        this.expandedCategoryBranches.delete(value);
      }
    });

    if (!this.expandedCategoryBranches.size && parentValues.length) {
      this.expandedCategoryBranches.add(parentValues[0]);
    }
  }

  private syncPriceFromAppliedFilters(minPrice: number | null | undefined, maxPrice: number | null | undefined): void {
    const min = minPrice ?? this.priceSliderMin;
    const max = maxPrice ?? this.priceSliderMax;

    this.minPriceValue = this.clampPriceValue(min);
    this.maxPriceValue = Math.max(this.clampPriceValue(max), this.minPriceValue);

    this.searchForm.patchValue(
      {
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null
      },
      { emitEvent: false }
    );
  }

  private clampPriceValue(value: number): number {
    return Math.max(this.priceSliderMin, Math.min(this.priceSliderMax, Math.round(value)));
  }

  private syncAndApplyPriceIfNeeded(): void {
    const isFullRange = this.minPriceValue === this.priceSliderMin && this.maxPriceValue === this.priceSliderMax;

    this.searchForm.patchValue(
      {
        minPrice: isFullRange ? null : this.minPriceValue,
        maxPrice: isFullRange ? null : this.maxPriceValue
      },
      { emitEvent: false }
    );

    if (!this.isMobileViewport()) {
      this.applyFilters();
    }
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 1199.98;
  }

  private lockBodyScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  private unlockBodyScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  private buildFacetsQuery(): string {

  return this.facets
    .map(facet => {

      const selectedValues = facet.values
        .filter(value => value.selected)
        .map(value => value.id);

      if (selectedValues.length === 0) {
        return null;
      }

      return `${facet.id}:${selectedValues.join(',')}`;
    })
    .filter(Boolean)
    .join(';');
}



selectCategory(categoryId: number): void {
  this.selectedCategoryId = categoryId;

  if (!this.isMobileViewport()) {
    this.applyFilters();
  }
}

toggleCategoryBranch(categoryId: number): void {
  if (this.expandedCategories.has(categoryId)) {
    this.expandedCategories.delete(categoryId);
  } else {
    this.expandedCategories.add(categoryId);
  }
}

isCategoryBranchOpen(categoryId: number): boolean {
  return this.expandedCategories.has(categoryId);
}

private buildSearchParams(): CatalogSearchParams {
  return {
    page: this.selectedPage,
    size: this.pageSize,
    query: this.searchForm.value.query?.trim() || undefined,
    minPrice: this.searchForm.value.minPrice,
    maxPrice: this.searchForm.value.maxPrice,
    categoryId: this.selectedCategoryId,
    facets: this.buildFacetsQuery()
  };
}

}



