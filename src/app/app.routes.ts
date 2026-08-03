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
    loadComponent: () => import('./features/account/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/register',
    title: 'Inscription',
    loadComponent: () => import('./features/account/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'auth/verify-email',
    title: 'Vérifiez votre email',
    loadComponent: () => import('./features/account/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent)
  },
  {
    path: 'auth/forgot-password',
    title: 'Mot de passe oublié',
    loadComponent: () => import('./features/account/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    title: 'Réinitialisation du mot de passe',
    loadComponent: () => import('./features/account/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'auth/verify',
    title: 'Activation du compte',
    loadComponent: () => import('./features/account/activation/activate-account.component').then((m) => m.ActivateAccountComponent)
  },
  {
    path: 'account/profile',
    title: 'Mon compte',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/profile/profile.component').then((m) => m.ProfileComponent)
  },
  { path: '**', redirectTo: '' }
];
