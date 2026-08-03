import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './activate-account.component.html',
  styleUrls: ['./activate-account.component.css']
})
export class ActivateAccountComponent {
  loading = true;
  successMessage = '';
  errorMessage = '';

  constructor(private route: ActivatedRoute, private authService: AuthService) {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading = false;
      this.errorMessage = 'Le lien d’activation est invalide ou incomplet.';
      return;
    }

    this.authService.verifyAccount(token).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) {
      return 'Impossible d’activer le compte.';
    }

    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      if (!trimmed) {
        return err.message || 'Impossible d’activer le compte.';
      }

      try {
        const parsed = JSON.parse(trimmed);
        return parsed.message || parsed.error || err.message || 'Impossible d’activer le compte.';
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

    return err.message || 'Impossible d’activer le compte.';
  }
}
