import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="bg-dark text-light py-4 mt-5">
      <div class="container text-center">
        <p class="mb-1">© 2026 Ecommerce App</p>
        <small>Built with Angular and a clean modular architecture.</small>
      </div>
    </footer>
  `,
  styles: [
    `.container { max-width: 1140px; }`
  ]
})
export class FooterComponent {}
