import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
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
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) {
      return 'Impossible de se connecter.';
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || 'Impossible de se connecter.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        return parsed.message || parsed.error || err.message || 'Impossible de se connecter.';
      } catch {
        return trimmed;
      }
    }

    if (err.error?.message) {
      return err.error.message;
    }

    if (err.error?.error) {
      return err.error.error;
    }

    return err.message || 'Impossible de se connecter.';
  }

  loginWithGoogle(): void {
    this.errorMessage = '';
    this.errorMessage = 'Connexion Google a brancher avec ton backend OAuth.';
  }
}
