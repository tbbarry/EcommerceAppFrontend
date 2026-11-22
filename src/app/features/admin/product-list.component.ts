import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminProductService } from '../../core/admin-product.service';
import { ProductAdminListResponse } from '../../models/admin-product.model';

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class AdminProductListComponent implements OnInit {
  products: ProductAdminListResponse[] = [];
  loading = false;
  errorMessage = '';
  currentPage = 0;
  readonly pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  constructor(private readonly adminProductService: AdminProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminProductService.getProductsList(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.products = response.content;
        this.currentPage = response.number;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = error instanceof HttpErrorResponse && error.status === 0
          ? 'Le serveur est inaccessible. Vérifiez la connexion au backend.'
          : 'Impossible de charger les produits. Veuillez réessayer.';
      }
    });
  }

  previousPage(): void {
    if (!this.loading && this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (!this.loading && this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  goToPage(page: number): void {
    if (!this.loading && page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  get pageNumbers(): number[] {
    const firstPage = Math.max(0, this.currentPage - 2);
    const lastPage = Math.min(this.totalPages, this.currentPage + 3);
    return Array.from({ length: lastPage - firstPage }, (_, index) => firstPage + index);
  }
}
