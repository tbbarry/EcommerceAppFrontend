import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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
  activeCategory: Category | null = null;

  constructor(private router: Router) {}

  showMegaMenu(category: Category): void {
    this.activeCategory = category;
  }

  hideMegaMenu(): void {
    this.activeCategory = null;
  }

  getGroups(items: Category[], size: number): Category[][] {
    const groups: Category[][] = [];

    for (let index = 0; index < items.length; index += size) {
      groups.push(items.slice(index, index + size));
    }

    return groups;
  }

  goToProducts(categoryId: number): void {
    this.hideMegaMenu();
    this.router.navigate(['/products'], {
      queryParams: {
        categoryId
      }
    });
  }
}
