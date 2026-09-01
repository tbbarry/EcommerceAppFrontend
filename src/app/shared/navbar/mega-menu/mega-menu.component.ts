import { Component } from '@angular/core';
import { Category } from '../../../models/categorie.model';
import { Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-mega-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './mega-menu.component.html',
  styleUrls: ['./mega-menu.component.css']
})
export class MegaMenuComponent {


  @Input({ required: true }) categories: Category[] = [];
  megaMenuOpen = false;
  hideTimeOut: any;

 

  isMenuOpen = false;
  activeMenu: string | null = null;
  constructor(private router: Router) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  showMegaMenu(menu: string) {
    this.activeMenu = menu;
  }

  hideMegaMenu() {
    this.activeMenu = null;
  }

  getGroups(items: any[], size: number): any[][] {
  const groups = [];

  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }

  return groups;
}



goToProducts(categoryId: number): void {
  this.hideMegaMenu()
  this.router.navigate(
    ['/products'],
    {
      queryParams: {
        categoryId: categoryId
      }
    }
  );
}


}
