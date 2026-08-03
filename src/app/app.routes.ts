import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Home',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'products',
    title: 'Produits',
    loadComponent: () => import('./features/product/product-list.component').then((m) => m.ProductListComponent)
  },
  {
    path: 'products/:id',
    title: 'Détail produit',
    loadComponent: () => import('./features/product/product-detail.component').then((m) => m.ProductDetailComponent)
  },
  {
    path: 'cart',
    title: 'Panier',
    loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent)
  },
  {
    path: 'auth/login',
    title: 'Connexion',
    loadComponent: () => import('./features/account/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/register',
    title: 'Inscription',
    loadComponent: () => import('./features/account/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'account/profile',
    title: 'Mon compte',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/profile.component').then((m) => m.ProfileComponent)
  },
  { path: '**', redirectTo: '' }
];
