import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartItem, CartService } from '../../core/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  readonly cartService = inject(CartService);

  setQuantity(item: CartItem, rawValue: string | number): void {
    const value = typeof rawValue === 'string' ? parseInt(rawValue, 10) : rawValue;
    if (Number.isFinite(value) && value > 0) {
      this.cartService.setQuantity(item, value);
    }
  }

  decrease(item: CartItem): void {
    if (item.quantity <= 1) {
      this.cartService.removeItem(item);
    } else {
      this.cartService.setQuantity(item, item.quantity - 1);
    }
  }

  increase(item: CartItem): void {
    this.cartService.setQuantity(item, item.quantity + 1);
  }

  remove(item: CartItem): void {
    this.cartService.removeItem(item);
  }

  dismissError(): void {
    this.cartService.cartError.set(null);
  }

  clearAll(): void {
    this.cartService.clearCart();
  }

  lineTotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  getVariantLabel(item: CartItem): string {
    const parts: string[] = [];
    if (item.color) {
      parts.push(`Color: ${item.color}`);
    }
    if (item.size) {
      parts.push(`Size: ${item.size}`);
    }
    return parts.join(' · ');
  }
}
