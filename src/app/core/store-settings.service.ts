import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface StoreSettings {
  name: string;
  logoVersion: string | null;
  aboutText: string;
  contactText: string;
  contactEmail: string;
}

export function isPublicStoreRequest(url: string, method: string): boolean {
  const base = (environment.apiBaseUrl || '').replace(/\/$/, '');
  const path = url.split('?')[0];
  return (method === 'GET' && path === `${base}/api/store-settings`)
    || (method === 'POST' && path === `${base}/api/contact-messages`);
}

@Injectable({ providedIn: 'root' })
export class StoreSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = (environment.apiBaseUrl || '').replace(/\/$/, '');
  readonly settings = signal<StoreSettings | null>(null);
  readonly error = signal(false);
  readonly name = computed(() => this.settings()?.name ?? '');
  readonly logoUrl = computed(() => {
    const version = this.settings()?.logoVersion;
    return version ? `${this.base}/api/store-settings/logo?v=${encodeURIComponent(version)}` : null;
  });

  load(): void {
    this.http.get<StoreSettings>(`${this.base}/api/store-settings`).subscribe({
      next: settings => {
        if (!settings || typeof settings.name !== 'string'
            || (settings.logoVersion !== null && typeof settings.logoVersion !== 'string')
            || typeof settings.aboutText !== 'string' || typeof settings.contactText !== 'string'
            || typeof settings.contactEmail !== 'string') {
          console.error('Invalid store settings response');
          this.error.set(true);
          return;
        }
        this.settings.set(settings);
        this.error.set(false);
      },
      error: error => { console.error('Could not load store settings', error); this.error.set(true); }
    });
  }

  updateName(name: string) {
    return this.http.put<StoreSettings>(`${this.base}/api/admin/store-settings`, { name });
  }

  updateContent(aboutText: string, contactText: string, contactEmail: string) {
    return this.http.put<StoreSettings>(`${this.base}/api/admin/store-settings/content`,
      { aboutText, contactText, contactEmail });
  }

  uploadLogo(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.put<StoreSettings>(`${this.base}/api/admin/store-settings/logo`, form);
  }

  removeLogo() {
    return this.http.delete<StoreSettings>(`${this.base}/api/admin/store-settings/logo`);
  }

  apply(settings: StoreSettings): void {
    this.settings.set(settings);
    this.error.set(false);
  }
}
