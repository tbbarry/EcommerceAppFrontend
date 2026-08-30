import { Component } from '@angular/core';
import { Category } from '../../../models/categorie.model';
import { Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mega-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './mega-menu.component.html',
  styleUrls: ['./mega-menu.component.css']
})
export class MegaMenuComponent {


  @Input({ required: true }) categories: Category[] = [];
  megaMenuOpen = false;

selectedCategoryIndex = 0;


toggleMegaMenu(event: Event): void {

  event.preventDefault();

  event.stopPropagation();

  this.megaMenuOpen = !this.megaMenuOpen;

  if (this.megaMenuOpen) {

    this.selectedCategoryIndex = 0;

    this.updateMegaMenuPosition();

  }

}


selectCategory(index: number, event: Event): void {

  event.preventDefault();

  event.stopPropagation();

  this.selectedCategoryIndex = index;

}


closeMegaMenu(): void {

  this.megaMenuOpen = false;

}


updateMegaMenuPosition(): void {

  const button = document.getElementById('categoriesMegaMenu');

  if (!button) {
    return;
  }

  const rect = button.getBoundingClientRect();

  document.documentElement.style.setProperty(
    '--mega-menu-top',
    `${rect.bottom}px`
  );

}

}
