import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="container py-5" *ngIf="product; else loadingOrNotFound">
      <div class="row g-4">
        <div class="col-md-6">
          <div class="border rounded p-4 bg-white">
            <h3>{{ product.name }}</h3>
            <p class="text-muted">{{ product.category || 'Sans catégorie' }}</p>
            <p>{{ product.description }}</p>
            <p class="fw-bold fs-4">{{ product.price | currency:'EUR' }}</p>
            <a routerLink="/cart" class="btn btn-primary">Aller au panier</a>
          </div>
        </div>
      </div>
    </section>
    <ng-template #loadingOrNotFound>
      <section class="container py-5">
        <div *ngIf="isLoading" class="alert alert-info">Chargement du produit...</div>
        <div *ngIf="!isLoading" class="alert alert-danger">Produit introuvable.</div>
      </section>
    </ng-template>
  `
})
export class ProductDetailComponent implements OnInit {
  product: any | null = null;
  isLoading = true;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const productId = params.get('id');
      if (!productId) {
        this.product = null;
        this.isLoading = false;
        return;
      }

      this.http
        .get<any>(`http://localhost:8082/api/products/${productId}`)
        .subscribe({
          next: (data) => {
            this.product = data;
            this.isLoading = false;
          },
          error: () => {
            this.product = null;
            this.isLoading = false;
          }
        });
    });
  }
}
