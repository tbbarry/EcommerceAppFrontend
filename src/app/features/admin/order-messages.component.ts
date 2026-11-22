import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { StoreSettingsService } from '../../core/store-settings.service';

interface Template { key: string; subject: string; message: string; }

@Component({
  selector: 'app-order-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-messages.component.html',
  styleUrl: './order-messages.component.css'
})
export class OrderMessagesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly store = inject(StoreSettingsService);
  private readonly url = `${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api/admin/order-messages`;
  templates: Template[] = [];
  selected: Template | null = null;
  original: Template | null = null;
  loading = false;
  saving = false;
  error = '';
  success = '';
  readonly labels: Record<string, string> = {
    PAID: 'Order confirmed', PROCESSING: 'Preparing order', SHIPPED: 'Order shipped',
    DELIVERED: 'Order delivered', CANCELLED: 'Order canceled', ADMIN_PAID: 'New paid order (admin)',
    ACCOUNT_ACTIVATION: 'Account activation', PASSWORD_RESET: 'Password reset'
  };

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.error = '';
    this.http.get<Template[]>(this.url).subscribe({
      next: templates => {
        this.templates = templates;
        this.loading = false;
        if (templates.length) this.select(templates[0]);
      },
      error: () => { this.loading = false; this.error = 'Could not load messages. Please try again.'; }
    });
  }
  select(template: Template): void {
    if (this.dirty && !confirm('Discard your unsaved changes?')) return;
    this.selected = { ...template };
    this.original = { ...template };
    this.error = '';
    this.success = '';
  }
  get dirty(): boolean {
    return !!this.selected && !!this.original
      && (this.selected.subject !== this.original.subject || this.selected.message !== this.original.message);
  }
  canLeave(): boolean { return !this.saving && (!this.dirty || confirm('Discard your unsaved changes?')); }
  save(): void {
    if (!this.selected || this.saving || !this.selected.subject.trim() || !this.selected.message.trim()) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    this.http.put<Template>(`${this.url}/${this.selected.key}`, {
      subject: this.selected.subject, message: this.selected.message
    }).subscribe({
      next: saved => {
        this.saving = false;
        this.templates = this.templates.map(item => item.key === saved.key ? saved : item);
        this.selected = { ...saved };
        this.original = { ...saved };
        this.success = 'Message saved. New notifications will use this version.';
      },
      error: error => {
        this.saving = false;
        this.error = typeof error.error?.message === 'string'
          ? error.error.message : 'Could not save this message. Please try again.';
      }
    });
  }
  preview(value: string): string {
    return value.replaceAll('{{customer_name}}', 'Alex')
      .replaceAll('{{order_number}}', 'ORD-1001')
      .replaceAll('{{user_name}}', 'Alex')
      .replaceAll('{{site_name}}', this.store.name());
  }
  isAccountTemplate(key: string): boolean {
    return key === 'ACCOUNT_ACTIVATION' || key === 'PASSWORD_RESET';
  }
}
