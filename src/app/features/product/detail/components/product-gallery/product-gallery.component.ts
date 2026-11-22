import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ProductImageViewModel } from '../../product-detail-view-model';

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-gallery.component.html',
  styleUrls: ['./product-gallery.component.css']
})
export class ProductGalleryComponent {
  @Input() images: ProductImageViewModel[] = [];
  @Input() selectedIndex = 0;
  @Input() productName = 'Produit';

  @Output() selectedIndexChange = new EventEmitter<number>();
  @Output() openViewer = new EventEmitter<void>();

  get currentImage(): ProductImageViewModel | null {
    return this.images[this.selectedIndex] || this.images[0] || null;
  }

  select(index: number): void {
    if (index < 0 || index >= this.images.length) {
      return;
    }

    this.selectedIndexChange.emit(index);
  }

  previous(): void {
    if (this.images.length < 2) {
      return;
    }

    const nextIndex = this.selectedIndex === 0 ? this.images.length - 1 : this.selectedIndex - 1;
    this.selectedIndexChange.emit(nextIndex);
  }

  next(): void {
    if (this.images.length < 2) {
      return;
    }

    const nextIndex = this.selectedIndex === this.images.length - 1 ? 0 : this.selectedIndex + 1;
    this.selectedIndexChange.emit(nextIndex);
  }

  trackById(_: number, image: ProductImageViewModel): number {
    return image.id;
  }
}
