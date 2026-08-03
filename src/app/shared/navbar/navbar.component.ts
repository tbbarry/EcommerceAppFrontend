import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div class="container">
        <a class="navbar-brand" routerLink="/">Ecommerce</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarMain">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" routerLink="/">Home</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/products">Shop</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/cart">Cart</a></li>
          </ul>
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
            <li class="nav-item" *ngIf="user$ | async as user; else guest">
              <a class="nav-link" routerLink="/account/profile">Bonjour, {{ user.name || user.email }}</a>
            </li>
            <li class="nav-item" *ngIf="user$ | async as user">
              <a class="nav-link" (click)="logout()" role="button">Logout</a>
            </li>
            <ng-template #guest>
              <li class="nav-item"><a class="nav-link" routerLink="/auth/login">Login</a></li>
              <li class="nav-item"><a class="nav-link" routerLink="/auth/register">Register</a></li>
            </ng-template>
          </ul>
        </div>
      </div>
    </nav>
  `,
  styles: [
    `.navbar { box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05); }`
  ]
})
export class NavbarComponent {
  private authService = inject(AuthService);
  readonly user$ = this.authService.user$;

  logout(): void {
    this.authService.logout();
  }
}
