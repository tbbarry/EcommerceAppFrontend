import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ProductColorViewModel } from '../../product-detail-view-model';

@Component({
  selector: 'app-color-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-selector.component.html',
  styleUrls: ['./color-selector.component.css']
})
export class ColorSelectorComponent {
  @Input() colors: ProductColorViewModel[] = [];
  @Input() selectedColor: string | null = null;
  @Output() choose = new EventEmitter<string>();

  select(colorName: string, available: boolean): void {
    if (!available) {
      return;
    }

    this.choose.emit(colorName);
  }

  swatch(name: string): string {
    const palette: Record<string, string> = {
      noir: '#111827',
      blanc: '#f8fafc',
      blanc_casse: '#f3efe6',
      bleu: '#2563eb',
      gris: '#6b7280',
      rouge: '#dc2626',
      vert: '#16a34a',
      jaune: '#eab308',
      beige: '#d6bfa2',
      marron: '#7c4a2f'
    };

    return palette[name.trim().toLowerCase().replace(/\s+/g, '_')] || '#94a3b8';
  }
}
