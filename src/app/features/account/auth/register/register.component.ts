import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { StoreSettingsService } from '../../../../core/store-settings.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  readonly store = inject(StoreSettingsService);
  private readonly strongPasswordPattern = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$/;
  readonly returnUrl: string;

  registerData = {
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  loading = false;
  errorMessage = '';
  passwordFocused = false;
  showPassword = false;
  showConfirmation = false;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/account/profile';
  }

  get hasFirstName(): boolean {
    return this.registerData.firstname.trim().length > 0;
  }

  get hasLastName(): boolean {
    return this.registerData.lastname.trim().length > 0;
  }

  get isEmailValid(): boolean {
    if (!this.registerData.email) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.registerData.email.trim());
  }

  get hasMinLength(): boolean {
    return this.registerData.password.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.registerData.password);
  }

  get hasDigit(): boolean {
    return /[0-9]/.test(this.registerData.password);
  }

  get hasSpecialCharacter(): boolean {
    return /[@#$%^&+=]/.test(this.registerData.password);
  }

  get isPasswordValid(): boolean {
    return this.hasMinLength && this.strongPasswordPattern.test(this.registerData.password);
  }

  get passwordsMatch(): boolean {
    return !!this.registerData.confirmPassword && this.registerData.password === this.registerData.confirmPassword;
  }

  get canSubmit(): boolean {
    return this.hasFirstName && this.hasLastName && this.isEmailValid && this.isPasswordValid && this.passwordsMatch;
  }

  register(): void {
    if (this.loading) return;
    this.errorMessage = '';

    if (!this.hasFirstName || !this.hasLastName) {
      this.errorMessage = 'Enter your first and last name.';
      return;
    }
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (!this.isPasswordValid) {
      this.errorMessage = 'Your password must contain at least 8 characters, an uppercase letter, a number, and a special character (@#$%^&+=).';
      return;
    }

    if (!this.isEmailValid) {
      this.errorMessage = 'Enter a valid email address.';
      return;
    }

    this.loading = true;

    this.auth.register({
      firstname: this.registerData.firstname.trim(),
      lastname: this.registerData.lastname.trim(),
      email: this.registerData.email.trim(),
      password: this.registerData.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email: this.registerData.email.trim(), returnUrl: this.returnUrl }
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    const fallback = 'Could not create your account.';

    if (!err) {
      return fallback;
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || fallback;
      }

      if (this.isDuplicateEmailError(trimmed)) {
        return 'This email address is already in use.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (this.isDuplicateEmailError(parsed)) {
          return 'This email address is already in use.';
        }

        return parsed.message || parsed.error || err.message || fallback;
      } catch {
        return trimmed;
      }
    }

    if (this.isDuplicateEmailError(err.error)) {
      return 'This email address is already in use.';
    }

    if (err.error?.message) {
      return err.error.message;
    }

    if (err.error?.error) {
      return err.error.error;
    }

    return err.message || fallback;
  }

  private isDuplicateEmailError(error: unknown): boolean {
    const text = this.stringifyError(error).toLowerCase();
    return (
      text.includes('users_email_key') ||
      text.includes('duplicate key value') ||
      text.includes('key (email)=') ||
      text.includes('email already exists') ||
      (text.includes('already exists') && text.includes('email'))
    );
  }

  private stringifyError(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

}
