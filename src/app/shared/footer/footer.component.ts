import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { StoreSettingsService } from '../../core/store-settings.service';
import { Category, MenuService } from '../../core/menu.service';
import { EMPTY, catchError, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="footer">
      <div class="footer-inner">
        <div class="brand"><strong>{{ store.name() }}</strong><p>Find pieces you'll love to wear.</p></div>
        <nav aria-label="Footer navigation">
          <div>
            <strong>Shop</strong><a routerLink="/products">All products</a>
            <a *ngFor="let category of categories" routerLink="/products" [queryParams]="{ categoryId: category.id }">{{ category.name }}</a>
            <span *ngIf="categoriesError" role="alert">Categories unavailable. <button type="button" (click)="reloadCategories()">Retry</button></span>
          </div>
          <div><strong>Account</strong><a routerLink="/account/profile">My account</a><a routerLink="/my-orders">My orders</a></div>
          <div><strong>Information</strong><a routerLink="/about">About us</a><a routerLink="/contact">Contact us</a></div>
        </nav>
      </div>
      <div class="copyright">© {{ year }} {{ store.name() }}. All rights reserved.</div>
    </footer>
  `,
  styles: [
    `.footer { background: #1c1c1b; color: #fff; margin-top: 4rem; padding: 3rem max(1.5rem, calc((100% - 1140px) / 2)) 1.5rem; }
     .footer-inner { display: flex; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
     .brand { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
     .brand strong { font-size: 1.5rem; } .brand p { color: #bbb; margin-top: .75rem; }
     nav { display: flex; flex-wrap: wrap; gap: clamp(2rem, 5vw, 5rem); } nav div { display: flex; flex-direction: column; gap: .65rem; }
     nav strong { font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; }
     a { color: #ccc; text-decoration: none; } a:hover { color: white; text-decoration: underline; }
     button { color: #fff; background: transparent; border: 0; text-decoration: underline; padding: 0; }
     .copyright { border-top: 1px solid #444; margin-top: 2.5rem; padding-top: 1.25rem; font-size: .8rem; color: #aaa; }`
  ]
})
export class FooterComponent {
  readonly store = inject(StoreSettingsService);
  private readonly menu = inject(MenuService);
  readonly year = new Date().getFullYear();
  categories: Category[] = [];
  categoriesError = false;

  constructor() {
    this.menu.changes$.pipe(
      startWith(undefined),
      switchMap(() => this.menu.getMenu().pipe(catchError(error => {
        console.error('Could not load footer categories', error);
        this.categories = [];
        this.categoriesError = true;
        return EMPTY;
      }))),
      takeUntilDestroyed()
    ).subscribe(categories => { this.categories = categories; this.categoriesError = false; });
  }

  reloadCategories(): void { this.menu.refresh(); }
}
