import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreSettings, StoreSettingsService } from '../../core/store-settings.service';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="settings">
      <header><p class="eyebrow">YOUR BRAND</p><h1>Store settings</h1><p>Manage how your store appears to customers.</p></header>
      @if (error) { <p class="notice error" role="alert">{{ error }}</p> }
      @if (success) { <p class="notice success" role="status">{{ success }}</p> }
      @if (store.settings()) {
        <div class="card">
          <h2>Store name</h2>
          <p>Shown across your store and in customer emails.</p>
          <form (ngSubmit)="saveName()">
            <label for="store-name">Store name</label>
            <input id="store-name" name="name" [(ngModel)]="name" maxlength="100" required [disabled]="busy">
            <button type="submit" [disabled]="busy || !name.trim()">Save name</button>
          </form>
        </div>
        <div class="card">
          <h2>Store logo</h2>
          <p>A small logo appears next to your name in the menu. PNG or JPEG, up to 1 MB.</p>
          @if (store.logoUrl(); as logo) {
            <div class="preview"><img [src]="logo" alt="Current store logo"><span>{{ store.name() }}</span></div>
          }
          <label for="logo">Choose an image</label>
          <input id="logo" type="file" accept="image/png,image/jpeg" (change)="choose($event)" [disabled]="busy">
          <div class="actions">
            <button type="button" (click)="upload()" [disabled]="busy || !file">Upload logo</button>
            @if (store.logoUrl()) { <button class="secondary" type="button" (click)="remove()" [disabled]="busy">Remove logo</button> }
          </div>
        </div>
        <div class="card">
          <h2>About and contact pages</h2>
          <p>These details are visible to customers. Leave a field empty if it does not apply.</p>
          <form #contentForm="ngForm" (ngSubmit)="saveContent()">
            <label for="about-text">About us</label>
            <textarea id="about-text" name="aboutText" [(ngModel)]="aboutText" maxlength="4000" rows="6" [disabled]="busy"></textarea>
            <label for="contact-text">Contact introduction</label>
            <textarea id="contact-text" name="contactText" [(ngModel)]="contactText" maxlength="4000" rows="4" [disabled]="busy"></textarea>
            <label for="contact-email">Public contact email (optional)</label>
            <input id="contact-email" name="contactEmail" type="email" email [(ngModel)]="contactEmail" maxlength="254" [disabled]="busy">
            <p>Customer messages can be answered from the admin inbox.</p>
            <button type="submit" [disabled]="busy || contentForm.invalid">Save page content</button>
          </form>
        </div>
      } @else if (!store.error()) { <p>Loading store settings...</p> }
    </section>
  `,
  styles: [`
    .settings { max-width: 760px; margin: 0 auto; color: #1d2730; }
    header { margin-bottom: 2rem; } h1 { font-size: clamp(1.8rem, 4vw, 2.4rem); margin: .25rem 0; }
    .eyebrow { color: #786756; font-size: .75rem; font-weight: 700; letter-spacing: .12em; }
    header p, .card p { color: #67717a; }
    .card { background: white; border: 1px solid #e6e8e9; border-radius: 16px; padding: clamp(1.2rem, 3vw, 2rem); margin-bottom: 1rem; }
    h2 { font-size: 1.15rem; margin: 0 0 .4rem; } label { display: block; font-weight: 600; margin: 1rem 0 .4rem; }
    input { max-width: 100%; } input[type=text], input[type=email], input:not([type]), textarea { width: 100%; padding: .75rem; border: 1px solid #cbd1d4; border-radius: 8px; } textarea { resize: vertical; }
    button { border: 0; border-radius: 8px; background: #222; color: white; padding: .7rem 1rem; margin-top: 1rem; font-weight: 600; }
    button:disabled { opacity: .5; } .secondary { background: #eee; color: #222; } .actions { display: flex; flex-wrap: wrap; gap: .6rem; }
    .preview { display: inline-flex; align-items: center; gap: .6rem; border: 1px solid #eee; border-radius: 10px; padding: .8rem; font-weight: 700; }
    .preview img { width: 32px; height: 32px; object-fit: contain; }
    .notice { padding: .8rem; border-radius: 8px; } .error { background: #fff0ef; color: #a12621; } .success { background: #e9f8ef; color: #20683d; }
  `]
})
export class StoreSettingsComponent {
  readonly store = inject(StoreSettingsService);
  name = '';
  aboutText = '';
  contactText = '';
  contactEmail = '';
  file: File | null = null;
  busy = false;
  error = '';
  success = '';
  private initialized = false;

  constructor() {
    effect(() => {
      const settings = this.store.settings();
      if (settings && !this.initialized) {
        this.name = settings.name;
        this.aboutText = settings.aboutText;
        this.contactText = settings.contactText;
        this.contactEmail = settings.contactEmail;
        this.initialized = true;
      }
    });
  }

  choose(event: Event): void {
    this.file = (event.target as HTMLInputElement).files?.item(0) ?? null;
  }

  canLeave(): boolean {
    const settings = this.store.settings();
    const changed = this.name !== (settings?.name ?? '') || this.aboutText !== (settings?.aboutText ?? '')
      || this.contactText !== (settings?.contactText ?? '') || this.contactEmail !== (settings?.contactEmail ?? '') || !!this.file;
    return !this.busy && (!changed || confirm('Discard your unsaved changes?'));
  }

  saveContent(): void {
    if (this.busy) return;
    this.busy = true;
    this.clearMessages();
    this.store.updateContent(this.aboutText, this.contactText, this.contactEmail.trim()).subscribe({
      next: settings => {
        this.aboutText = settings.aboutText;
        this.contactText = settings.contactText;
        this.contactEmail = settings.contactEmail;
        this.finish(settings, 'Page content saved.');
      },
      error: () => this.fail('Could not save page content. Check the email and try again.')
    });
  }

  saveName(): void {
    if (this.busy || !this.name.trim()) return;
    this.busy = true;
    this.clearMessages();
    this.store.updateName(this.name).subscribe({
      next: settings => { this.name = settings.name; this.finish(settings, 'Store name saved.'); },
      error: () => this.fail('Could not save the store name.')
    });
  }

  upload(): void {
    if (this.busy || !this.file) return;
    if (this.file.size > 1024 * 1024 || !['image/png', 'image/jpeg'].includes(this.file.type)) {
      this.error = 'Choose a PNG or JPEG under 1 MB.';
      return;
    }
    this.busy = true;
    this.clearMessages();
    this.store.uploadLogo(this.file).subscribe({
      next: settings => { this.file = null; this.finish(settings, 'Logo updated.'); },
      error: () => this.fail('Could not upload the logo. Check the image and try again.')
    });
  }

  remove(): void {
    if (this.busy) return;
    this.busy = true;
    this.clearMessages();
    this.store.removeLogo().subscribe({
      next: settings => this.finish(settings, 'Logo removed.'),
      error: () => this.fail('Could not remove the logo.')
    });
  }

  private finish(settings: StoreSettings, message: string): void {
    this.store.apply(settings);
    this.busy = false;
    this.success = message;
  }

  private fail(message: string): void { this.busy = false; this.error = message; }
  private clearMessages(): void { this.error = ''; this.success = ''; }
}
