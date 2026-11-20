import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
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

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.registerData.email);
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
    this.errorMessage = '';

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (!this.isPasswordValid) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, un chiffre et un caractere special (@#$%^&+=).';
      return;
    }

    if (!this.isEmailValid) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }

    this.loading = true;

    this.auth.register({
      firstname: this.registerData.firstname,
      lastname: this.registerData.lastname,
      email: this.registerData.email,
      password: this.registerData.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email: this.registerData.email, returnUrl: this.returnUrl }
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    const fallback = 'Impossible de créer le compte.';

    if (!err) {
      return fallback;
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || fallback;
      }

      if (this.isDuplicateEmailError(trimmed)) {
        return 'Cette adresse email est déjà utilisée.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (this.isDuplicateEmailError(parsed)) {
          return 'Cette adresse email est déjà utilisée.';
        }

        return parsed.message || parsed.error || err.message || fallback;
      } catch {
        return trimmed;
      }
    }

    if (this.isDuplicateEmailError(err.error)) {
      return 'Cette adresse email est déjà utilisée.';
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

  registerWithGoogle(): void {
    this.errorMessage = 'Inscription Google a brancher avec ton backend OAuth.';
  }
}
