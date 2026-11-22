import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';
import { AddProductComponent } from './features/product/add-product.component';
import type { AdminProductDetailComponent } from './features/admin/product-detail.component';
import type { PromotionManagementComponent } from './features/admin/promotion-management.component';
import type { PromotionAssignmentsComponent } from './features/admin/promotion-assignments.component';
import type { TaxonomyManagementComponent } from './features/admin/taxonomy-management.component';
import type { ShippingMethodManagementComponent } from './features/admin/shipping-method-management.component';
import type { OrderMessagesComponent } from './features/admin/order-messages.component';
import type { StoreSettingsComponent } from './features/admin/store-settings.component';
import type { ContactMessagesComponent } from './features/admin/contact-messages.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/store-layout.component').then((m) => m.StoreLayoutComponent),
    children: [
  {
    path: '',
    title: 'Home',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'about',
    title: 'About us',
    loadComponent: () => import('./features/info/about.component').then((m) => m.AboutComponent)
  },
  {
    path: 'contact',
    title: 'Contact us',
    loadComponent: () => import('./features/info/contact.component').then((m) => m.ContactComponent)
  },
  {
    path: 'products',
    title: 'Products',
    loadComponent: () => import('./features/product/product-list.component').then((m) => m.ProductListComponent)
  },
  {
    path: 'category',
    title: 'Shop',
    loadComponent: () => import('./features/product/product-list.component').then((m) => m.ProductListComponent)
  },
  {
    path: 'products/:slug',
    title: 'Product details',
    loadComponent: () => import('./features/product/product-detail.component').then((m) => m.ProductDetailComponent)
  },
  {
    path: 'cart',
    title: 'Cart',
    loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent)
  },
  {
    path: 'checkout',
    title: 'Checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent)
  },
  {
    path: 'order-confirmation/:orderId',
    title: 'Order confirmation',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-confirmation/order-confirmation.component').then((m) => m.OrderConfirmationComponent)
  },
  {
    path: 'auth/login',
    title: 'Sign in',
    loadComponent: () => import('./features/account/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/register',
    title: 'Create account',
    loadComponent: () => import('./features/account/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'auth/verify-email',
    title: 'Verify your email',
    loadComponent: () => import('./features/account/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent)
  },
  {
    path: 'auth/forgot-password',
    title: 'Forgot password',
    loadComponent: () => import('./features/account/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    title: 'Reset password',
    loadComponent: () => import('./features/account/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'auth/verify',
    title: 'Account activation',
    loadComponent: () => import('./features/account/activation/activate-account.component').then((m) => m.ActivateAccountComponent)
  },
  {
    path: 'account/profile',
    title: 'My account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/profile/profile.component').then((m) => m.ProfileComponent)
  },
  {
    path: 'payment/success',
    title: 'Payment confirmation',
    loadComponent: () => import('./features/paiement-success/paiement-success.component').then((m) => m.PaymentSuccessComponent)
  },
  {
    path: 'payment-cancel',
    title: 'Payment canceled',
    loadComponent: () => import('./features/payment-cancel/payment-cancel.component').then((m) => m.PaymentCancelComponent)
  },
  {
    path: 'my-orders',
    title: 'My orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/orders/orders.component').then((m) => m.OrdersComponent)
  },
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'contact-messages',
    title: 'Customer messages',
    canActivate: [adminGuard],
    canDeactivate: [(component: ContactMessagesComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/contact-messages.component').then((m) => m.ContactMessagesComponent)
  },
  {
    path: 'store-settings',
    title: 'Store settings',
    canActivate: [adminGuard],
    canDeactivate: [(component: StoreSettingsComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/store-settings.component').then((m) => m.StoreSettingsComponent)
  },
  {
    path: 'order-messages',
    title: 'Email messages',
    canActivate: [adminGuard],
    canDeactivate: [(component: OrderMessagesComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/order-messages.component').then((m) => m.OrderMessagesComponent)
  },
  {
    path: 'reviews',
    title: 'Reviews',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/review-management.component').then((m) => m.ReviewManagementComponent)
  },
  {
    path: 'orders',
    title: 'Orders',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/order-management.component').then((m) => m.OrderManagementComponent)
  },
  {
    path: 'shipping-methods',
    title: 'Shipping methods',
    canActivate: [adminGuard],
    canDeactivate: [(component: ShippingMethodManagementComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/shipping-method-management.component').then((m) => m.ShippingMethodManagementComponent)
  },
  {
    path: 'categories',
    title: 'Categories and attributes',
    canActivate: [adminGuard],
    canDeactivate: [(component: TaxonomyManagementComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/taxonomy-management.component').then((m) => m.TaxonomyManagementComponent)
  },
  {
    path: 'promotions',
    title: 'Promotions',
    canActivate: [adminGuard],
    canDeactivate: [(component: PromotionManagementComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/promotion-management.component').then((m) => m.PromotionManagementComponent)
  },
  {
    path: 'promotions/:id/assignments',
    title: 'Promotion products',
    canActivate: [adminGuard],
    canDeactivate: [(component: PromotionAssignmentsComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/promotion-assignments.component').then((m) => m.PromotionAssignmentsComponent)
  },
  {
    path: 'products',
    title: 'Products',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/product-list.component').then((m) => m.AdminProductListComponent)
  },
  {
    path: 'products/add',
    title: 'Add product',
    canActivate: [adminGuard],
    component: AddProductComponent
  },
  {
    path: 'products/:id',
    title: 'Product details',
    canActivate: [adminGuard],
    canDeactivate: [(component: AdminProductDetailComponent) => component.canLeave()],
    loadComponent: () => import('./features/admin/product-detail.component').then((m) => m.AdminProductDetailComponent)
  }
    ]
  },
  { path: '**', redirectTo: '' }
];
