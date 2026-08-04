import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  private authService = inject(AuthService);
  readonly user$ = this.authService.user$;

  getDisplayName(user: User): string {
    const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();
    return fullName || user.email || 'Client';
  }

  logout(): void {
    this.authService.logout();
  }
}
