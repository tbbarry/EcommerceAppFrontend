import { Component, OnInit, effect, inject } from '@angular/core';
import { Router, RouterOutlet, TitleStrategy } from '@angular/router';
import { AuthService } from './core/auth.service';
import { StoreSettingsService } from './core/store-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'ecommerce-app';
  readonly store = inject(StoreSettingsService);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(TitleStrategy);

  constructor(private authService: AuthService) {
    effect(() => {
      this.store.name();
      this.updateTitle();
    });
  }

  ngOnInit(): void {
    this.authService.initAuthState();
    this.store.load();
  }

  private updateTitle(): void {
    this.titleStrategy.updateTitle(this.router.routerState.snapshot);
  }
}
