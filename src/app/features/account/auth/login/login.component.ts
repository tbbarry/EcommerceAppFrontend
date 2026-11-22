import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { StoreSettingsService } from '../../../../core/store-settings.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['../register/register.component.css', './login.component.css']
})
export class LoginComponent {
  readonly store = inject(StoreSettingsService);
  credentials = { email: '', password: '' };
  loading = false;
  errorMessage = '';
  showPassword = false;
  readonly returnUrl: string;
  readonly passwordChanged: boolean;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/products';
    this.passwordChanged = this.route.snapshot.queryParamMap.get('passwordChanged') === '1';
  }

  login(): void {
    if (this.loading) return;
    if (!this.credentials.email.trim() || !this.credentials.password) {
      this.errorMessage = 'Enter your email address and password.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.auth.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.auth.currentUser?.mustChangePassword ? '/account/profile' : this.returnUrl);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) {
      return 'Unable to sign in.';
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || 'Unable to sign in.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        return parsed.message || parsed.error || err.message || 'Unable to sign in.';
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

    return err.message || 'Unable to sign in.';
  }

}
