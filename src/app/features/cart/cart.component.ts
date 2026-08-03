import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="alert alert-secondary">
            <h2>Panier</h2>
            <p>Le panier de l’utilisateur sera bientôt connecté à votre backend.</p>
          </div>
          <div class="card mb-4">
            <div class="card-body text-center">
              <p class="mb-3">Aucun produit dans le panier pour le moment.</p>
              <a routerLink="/products" class="btn btn-primary">Retour au shop</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class CartComponent {}
