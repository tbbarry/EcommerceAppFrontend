import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ProductSizeViewModel } from '../../product-detail-view-model';

@Component({
  selector: 'app-size-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './size-selector.component.html',
  styleUrls: ['./size-selector.component.css']
})
export class SizeSelectorComponent {
  @Input() sizes: ProductSizeViewModel[] = [];
  @Input() selectedSize: string | null = null;
  @Input() disabledMap: Record<string, boolean> = {};
  @Output() choose = new EventEmitter<string>();

  isDisabled(sizeValue: string, sizeAvailable: boolean): boolean {
    return !sizeAvailable || this.disabledMap[sizeValue] === true;
  }

  select(sizeValue: string, sizeAvailable: boolean): void {
    if (this.isDisabled(sizeValue, sizeAvailable)) {
      return;
    }

    this.choose.emit(sizeValue);
  }
}
