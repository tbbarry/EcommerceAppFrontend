import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card p-4">
            <h2>Mon compte</h2>
            <p *ngIf="user; else noUser">Bienvenue, {{ user.name || user.email }}.</p>
            <div *ngIf="user" class="mt-4">
              <p><strong>Email :</strong> {{ user.email }}</p>
              <p><strong>Rôle :</strong> {{ user.role || 'Client' }}</p>
              <button class="btn btn-outline-danger" (click)="logout()">Déconnexion</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <ng-template #noUser>
      <div class="alert alert-warning">Aucun utilisateur connecté.</div>
    </ng-template>
  `
})
export class ProfileComponent {
  user: User | null = null;

  constructor(private authService: AuthService) {
    this.user = this.authService.currentUser;
  }

  logout(): void {
    this.authService.logout();
  }
}
