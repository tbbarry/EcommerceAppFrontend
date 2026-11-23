
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { EMPTY, catchError, filter, startWith, switchMap } from 'rxjs';

import { AuthService, User } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { MenuService, Category } from '../../core/menu.service';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';
import { StoreSettingsService } from '../../core/store-settings.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, MegaMenuComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnDestroy {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);

  readonly cartService = inject(CartService);
  readonly store = inject(StoreSettingsService);
  readonly user$ = this.authService.user$;


  categories: Category[] = [];
  menuError = false;
  isMobileMenuOpen = false;
  isMobileSearchOpen = false;
  expandedCategories = new Set<number>();
  searchQuery = '';

  constructor() {
    this.menuService.changes$.pipe(
      startWith(undefined),
      switchMap(() => this.menuService.getMenu().pipe(catchError(error => {
        this.menuError = true;
        console.error('Erreur lors du chargement du menu', error);
        return EMPTY;
      }))),
      takeUntilDestroyed()
    ).subscribe(categories => { this.categories = categories; this.menuError = false; });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.closeMobileMenu();
        this.isMobileSearchOpen = false;
      });
  }

  loadMenu(): void {
    this.menuService.refresh();
  }

  ngOnDestroy(): void {
    this.syncBodyMobileNavState(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileMenu();
    this.isMobileSearchOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 1200) this.closeMobileMenu();
  }

  getDisplayName(user: User): string {
    const fullName =
      `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();

    return fullName || user.email || 'Client';
  }

  logout(): void {
    this.authService.logout();
  }

  search(): void {
    const query = this.searchQuery.trim();
    this.router.navigate(['/products'], { queryParams: query ? { query } : {} });
    this.closeMobileMenu();
    this.isMobileSearchOpen = false;
  }

  toggleCategory(id: number): void {
    if (this.expandedCategories.has(id)) this.expandedCategories.delete(id);
    else this.expandedCategories.add(id);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.syncBodyMobileNavState(this.isMobileMenuOpen);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.expandedCategories.clear();
    this.syncBodyMobileNavState(false);
  }

  private syncBodyMobileNavState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle(
      'mobile-nav-active',
      isOpen
    );
  }

}

