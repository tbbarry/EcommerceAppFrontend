import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, User } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly cartService = inject(CartService);
  readonly user$ = this.authService.user$;
  isMobileMenuOpen = false;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  getDisplayName(user: User): string {
    const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();
    return fullName || user.email || 'Client';
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.syncBodyMobileNavState(this.isMobileMenuOpen);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.syncBodyMobileNavState(false);
  }

  private syncBodyMobileNavState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.classList.toggle('mobile-nav-active', isOpen);
  }
}
