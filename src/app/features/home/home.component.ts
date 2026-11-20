import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="hero py-5 bg-light text-center">
      <div class="container">
        <h1>Bienvenue sur votre boutique e-commerce</h1>
        <p class="lead">Découvre les meilleurs produits, gérer ton panier et finalise tes commandes.</p>
        <a routerLink="/products" class="btn btn-primary btn-lg mt-3">Voir les produits</a>
      </div>
    </section>

    <section class="container py-5">
      <div class="row gap-4 justify-content-center">
        <div class="col-md-4 p-4 border rounded bg-white">
          <h2>Catalogue produit</h2>
          <p>Parcourir les produits, voir les détails et ajouter au panier.</p>
          <a routerLink="/products" class="btn btn-outline-primary">Shop</a>
        </div>
        <div class="col-md-4 p-4 border rounded bg-white">
          <h2>Mon panier</h2>
          <p>Ton panier est accessible à tout moment, prêt pour le checkout.</p>
          <a routerLink="/cart" class="btn btn-outline-primary">Panier</a>
        </div>
        <div class="col-md-4 p-4 border rounded bg-white">
          <h2>Mon compte</h2>
          <p>Connecte-toi pour voir ton profil, tes commandes et tes infos.</p>
          <a routerLink="/auth/login" class="btn btn-outline-primary">Login</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    `.hero { min-height: 320px; display: flex; align-items: center; }
     .hero h1 { margin-bottom: 0.75rem; }
    `
  ]
})
export class HomeComponent {}
