import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card p-4">
            <h2 class="mb-4">Connexion</h2>
            <form (ngSubmit)="login()">
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input class="form-control" type="email" [(ngModel)]="credentials.email" name="email" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Mot de passe</label>
                <input class="form-control" type="password" [(ngModel)]="credentials.password" name="password" required />
              </div>
              <button class="btn btn-primary w-100" type="submit" [disabled]="loading">Se connecter</button>
            </form>
            <div *ngIf="errorMessage" class="mt-3 alert alert-danger">{{ errorMessage }}</div>
            <p class="mt-4 text-center">
              Pas encore de compte ? <a routerLink="/auth/register">Créer un compte</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class LoginComponent {
  credentials = { email: '', password: '' };
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  login(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auth.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/account/profile']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Impossible de se connecter.';
      }
    });
  }
}
