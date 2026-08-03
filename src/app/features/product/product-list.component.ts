import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Produits</h2>
          <p class="text-muted">Parcourez notre catalogue disponible.</p>
        </div>
      </div>
      <div *ngIf="products.length; else noProducts" class="row g-4">
        <div *ngFor="let product of products" class="col-sm-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">{{ product.name }}</h5>
              <p class="card-text text-truncate">{{ product.description }}</p>
              <p class="card-text fw-bold">{{ product.price | currency:'EUR' }}</p>
              <a [routerLink]="['/products', product.id]" class="mt-auto btn btn-outline-primary">Voir le produit</a>
            </div>
          </div>
        </div>
      </div>
      <ng-template #noProducts>
        <div class="alert alert-warning">Aucun produit trouvé pour le moment.</div>
      </ng-template>
    </section>
  `
})
export class ProductListComponent implements OnInit {
  products: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get<any[]>('http://localhost:8082/api/products')
      .subscribe((data) => {
        this.products = data || [];
      });
  }
}
