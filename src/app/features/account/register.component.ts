import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card p-4">
            <h2 class="mb-4">Inscription</h2>
            <form (ngSubmit)="register()">
              <div class="mb-3">
                <label class="form-label">Nom</label>
                <input class="form-control" type="text" [(ngModel)]="user.name" name="name" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input class="form-control" type="email" [(ngModel)]="user.email" name="email" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Mot de passe</label>
                <input class="form-control" type="password" [(ngModel)]="user.password" name="password" required />
              </div>
              <button class="btn btn-primary w-100" type="submit" [disabled]="loading">Créer mon compte</button>
            </form>
            <div *ngIf="message" class="mt-3 alert alert-success">{{ message }}</div>
            <div *ngIf="errorMessage" class="mt-3 alert alert-danger">{{ errorMessage }}</div>
            <p class="mt-4 text-center">
              Déjà un compte ? <a routerLink="/auth/login">Se connecter</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class RegisterComponent {
  user = { name: '', email: '', password: '' };
  loading = false;
  message = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  register(): void {
    this.loading = true;
    this.errorMessage = '';
    this.message = '';

    this.auth.register(this.user).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Inscription réussie. Vous pouvez maintenant vous connecter.';
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Impossible de créer le compte.';
      }
    });
  }
}
