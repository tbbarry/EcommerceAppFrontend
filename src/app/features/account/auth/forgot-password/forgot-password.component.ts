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
        this.successMessage = 'If an account exists for this address, a reset email has been sent.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) {
      return 'Could not process your request.';
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || 'Could not process your request.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        return parsed.message || parsed.error || err.message || 'Could not process your request.';
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

    return err.message || 'Could not process your request.';
  }
}
