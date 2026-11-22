import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { StoreSettingsService } from '../../core/store-settings.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="info-page">
      <p class="eyebrow">WE'RE HERE TO HELP</p>
      <h1>Contact us</h1>
      <div class="contact-grid">
        <section class="info-card">
          <h2>Let's talk</h2>
          @if (store.settings(); as settings) {
            @if (settings.contactText) { <p class="content">{{ settings.contactText }}</p> }
            @if (settings.contactEmail) {
              <p>Email us at <a [href]="'mailto:' + settings.contactEmail">{{ settings.contactEmail }}</a></p>
            }
          }
          <p>Send us a message and we'll reply by email.</p>
        </section>
        <section class="info-card">
          <h2>Send a message</h2>
          @if (success) { <p class="success" role="status">Your message was sent. We'll reply by email.</p> }
          @if (error) { <p class="error" role="alert">{{ error }}</p> }
          <form #contactForm="ngForm" (ngSubmit)="send(contactForm)">
            <label for="contact-name">Your name</label>
            <input id="contact-name" name="name" [(ngModel)]="name" required maxlength="100" [disabled]="sending" autocomplete="name">
            <label for="contact-address">Email address</label>
            <input id="contact-address" name="email" type="email" email [pattern]="emailPattern" [(ngModel)]="email" #emailField="ngModel" required maxlength="254" [disabled]="sending" autocomplete="email">
            @if (emailField.invalid && emailField.touched) { <p class="error">Enter a valid email address.</p> }
            <label for="contact-message">Message</label>
            <textarea id="contact-message" name="message" [(ngModel)]="message" required maxlength="4000" rows="7" [disabled]="sending"></textarea>
            <button type="submit" [disabled]="sending || contactForm.invalid || !name.trim() || !message.trim()">
              {{ sending ? 'Sending...' : 'Send message' }}
            </button>
          </form>
        </section>
      </div>
    </main>
  `,
  styleUrl: './info-page.css'
})
export class ContactComponent {
  readonly store = inject(StoreSettingsService);
  private readonly http = inject(HttpClient);
  private readonly url = `${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api/contact-messages`;
  readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  name = '';
  email = '';
  message = '';
  sending = false;
  success = false;
  error = '';

  send(form: NgForm): void {
    if (this.sending || form.invalid || !this.name.trim() || !this.message.trim()) return;
    this.sending = true;
    this.success = false;
    this.error = '';
    this.http.post<void>(this.url, {
      name: this.name.trim(), email: this.email.trim(), message: this.message.trim()
    }).subscribe({
      next: () => { this.sending = false; this.success = true; form.resetForm({ name: '', email: '', message: '' }); },
      error: (error: HttpErrorResponse) => {
        this.sending = false;
        this.error = error.status === 429
          ? 'Too many messages. Please wait before trying again.'
          : 'Your message could not be sent. Please try again.';
      }
    });
  }
}
