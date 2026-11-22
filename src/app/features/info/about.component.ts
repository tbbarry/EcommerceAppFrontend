import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreSettingsService } from '../../core/store-settings.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="info-page">
      <p class="eyebrow">OUR STORY</p>
      <h1>About {{ store.name() }}</h1>
      <section class="info-card">
        @if (store.settings(); as settings) {
          <p class="content">{{ settings.aboutText || 'Our story is coming soon.' }}</p>
        } @else if (!store.error()) { <p>Loading...</p> }
        <a class="shop-link" routerLink="/products">Explore the collection <span aria-hidden="true">→</span></a>
      </section>
    </main>
  `,
  styleUrl: './info-page.css'
})
export class AboutComponent {
  readonly store = inject(StoreSettingsService);
}
