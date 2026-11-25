import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, inject } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { Category } from '../../../core/menu.service';

@Component({
  selector: 'app-mega-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mega-menu.component.html',
  styleUrls: ['./mega-menu.component.css']
})
export class MegaMenuComponent {
  @Input({ required: true }) categories: Category[] = [];
  readonly router = inject(Router);
  readonly activatedRoute = inject(ActivatedRoute);
  activeCategory: Category | null = null;
  private openedByHover = false;

  showMegaMenu(category: Category): void {
    this.activeCategory = category.children.length ? category : null;
    this.openedByHover = this.activeCategory !== null;
  }

  toggleMegaMenu(category: Category): void {
    if (this.activeCategory?.id === category.id && !this.openedByHover) {
      this.hideMegaMenu();
    } else {
      this.activeCategory = category;
      this.openedByHover = false;
    }
  }

  onHomeOrShopHover(): void {
    this.hideMegaMenu();
  }

  isActiveCategoryFilter(categoryId: number): boolean {
    const categoryIdParam = this.activatedRoute.snapshot.queryParamMap.get('categoryId');
    return categoryIdParam ? parseInt(categoryIdParam, 10) === categoryId : false;
  }

  @HostListener('document:keydown.escape')
  hideMegaMenu(): void {
    this.activeCategory = null;
    this.openedByHover = false;
  }

  onFocusOut(event: FocusEvent): void {
    const shell = event.currentTarget;
    if (shell instanceof HTMLElement && !shell.contains(event.relatedTarget as Node | null)) {
      this.hideMegaMenu();
    }
  }
}

