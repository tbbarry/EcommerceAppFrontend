
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService, User } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { MenuService, Category } from '../../core/menu.service';
import type { MegaMenuCategory } from '../../models/categorie.model';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, MegaMenuComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);

  readonly cartService = inject(CartService);
  readonly user$ = this.authService.user$;


  // =========================
  // MENU
  // =========================

  categories: Category[] = [];
  megaMenuCategories: MegaMenuCategory[] = [];

  selectedCategory: Category | null = null;

  // =========================
  // MOBILE
  // =========================

  isMobileMenuOpen = false;

  constructor() {

    // Chargement du menu depuis l'API
    this.menuService.getMenu()
      .pipe(
        takeUntilDestroyed()
      )
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.megaMenuCategories = this.buildMegaMenu(categories);

          // Première catégorie sélectionnée par défaut
          if (categories.length > 0) {
            this.selectedCategory = categories[0];
          }

          console.log('Menu chargé :', categories);
        },
        error: (error) => {
          console.error(
            'Erreur lors du chargement du menu',
            error
          );
        }
      });

    // Fermeture du menu mobile après navigation
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  // =========================
  // MENU
  // =========================

  selectCategory(category: Category): void {
    this.selectedCategory = category;
  }

  // =========================
  // ACCOUNT
  // =========================

  getDisplayName(user: User): string {
    const fullName =
      `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();

    return fullName || user.email || 'Client';
  }

  logout(): void {
    console.log('Logging out...');
    this.authService.logout();
  }

  // =========================
  // MOBILE MENU
  // =========================

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

    document.body.classList.toggle(
      'mobile-nav-active',
      isOpen
    );
  }

  openMegaMenu(category: Category) {
  this.selectedCategory = category;
}

closeMegaMenu() {
  this.selectedCategory = null;
}

buildMegaMenu(categories: Category[]): MegaMenuCategory[] {
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    columns: category.children.map(child => ({
      title: child.name,
      links: child.children.map(grandchild => ({
        id: grandchild.id,
        name: grandchild.name
      }))
    }))
  }));
}

/*  mega menu*/
  megaMenuOpen = false;
  hideTimeOut: any;



  isMenuOpen = false;
  activeMenu: string | null = null;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  showMegaMenu(menu: string) {
    this.activeMenu = menu;
  }

  hideMegaMenu() {
    this.activeMenu = null;
  }
}

