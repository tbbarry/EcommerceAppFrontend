import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private authService: AuthService) {}

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) {
      return 'Impossible de traiter la demande.';
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || 'Impossible de traiter la demande.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        return parsed.message || parsed.error || err.message || 'Impossible de traiter la demande.';
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

    return err.message || 'Impossible de traiter la demande.';
  }
}
