import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  private readonly strongPasswordPattern = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$/;

  newPassword = '';
  confirmPassword = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  private readonly token: string | null;

  constructor(private authService: AuthService, private route: ActivatedRoute, private router: Router) {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasDigit(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  get hasSpecialCharacter(): boolean {
    return /[@#$%^&+=]/.test(this.newPassword);
  }

  get isPasswordValid(): boolean {
    return this.hasMinLength && this.strongPasswordPattern.test(this.newPassword);
  }

  get passwordsMatch(): boolean {
    return !!this.confirmPassword && this.newPassword === this.confirmPassword;
  }

  get canSubmit(): boolean {
    return !!this.token && this.isPasswordValid && this.passwordsMatch;
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'Le lien de réinitialisation est invalide.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (!this.isPasswordValid) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, un chiffre et un caractere special (@#$%^&+=).';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Votre mot de passe a été réinitialisé avec succès.';
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    const fallback = 'Impossible de réinitialiser le mot de passe.';

    if (!err) {
      return fallback;
    }

    const payload = this.normalizeErrorPayload(err.error);

    const detailed = this.extractDetailedValidationMessage(payload);
    if (detailed) {
      return detailed;
    }

    const payloadMessage = this.pickMessage(payload?.message);
    if (payloadMessage && !/^validation\s*error$/i.test(payloadMessage)) {
      return payloadMessage;
    }

    const payloadError = this.pickMessage(payload?.error);
    if (payloadError) {
      return payloadError;
    }

    return this.pickMessage(err.message) || fallback;
  }

  private normalizeErrorPayload(error: unknown): any {
    if (typeof error !== 'string') {
      return error;
    }

    const trimmed = error.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private extractDetailedValidationMessage(payload: any): string {
    const candidates = [
      payload?.errors,
      payload?.details,
      payload?.constraints,
      payload?.violations
    ];

    for (const candidate of candidates) {
      const message = this.pickMessage(candidate);
      if (message) {
        return message;
      }
    }

    return '';
  }

  private pickMessage(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const message = this.pickMessage(item);
        if (message) {
          return message;
        }
      }
      return '';
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;

      const prioritizedKeys = ['constraints', 'messages', 'message', 'details', 'detail', 'violations', 'error'];
      for (const key of prioritizedKeys) {
        const message = this.pickMessage(record[key]);
        if (message) {
          return message;
        }
      }

      const ignoredKeys = new Set(['property', 'field', 'path', 'param', 'target', 'children', 'value']);
      for (const [key, nestedValue] of Object.entries(record)) {
        if (ignoredKeys.has(key)) {
          continue;
        }

        const message = this.pickMessage(nestedValue);
        if (message) {
          return message;
        }
      }
    }

    return '';
  }
}
