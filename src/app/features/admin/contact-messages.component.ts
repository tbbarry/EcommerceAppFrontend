import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  repliedAt: string | null;
  replySubject: string | null;
  replyMessage: string | null;
}

interface MessagePage {
  content: ContactMessage[];
  number: number;
  totalPages: number;
}

@Component({
  selector: 'app-contact-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="inbox">
      <header><p class="eyebrow">CUSTOMER COMMUNICATIONS</p><h1>Contact inbox</h1>
        <p>Read and reply to customer messages.</p></header>
      <p *ngIf="loading" role="status">Loading messages...</p>
      <p *ngIf="error" class="alert" role="alert">{{ error }}
        <button *ngIf="loadFailed" type="button" (click)="load(page)">Try again</button></p>
      <p *ngIf="success" class="success" role="status">{{ success }}</p>
      <div class="workspace" *ngIf="!loading && !loadFailed">
        <section class="list" aria-label="Contact messages">
          <p *ngIf="!messages.length">No messages yet.</p>
          <button *ngFor="let item of messages" type="button" class="message-button"
            [class.active]="selected?.id === item.id" [disabled]="sending"
            [attr.aria-current]="selected?.id === item.id ? 'true' : null" (click)="select(item)">
            <strong>{{ item.name }}</strong><span>{{ item.createdAt | date:'medium' }}</span>
            <span>{{ item.repliedAt ? 'Replied' : 'Awaiting reply' }}</span>
          </button>
          <div class="pagination" *ngIf="totalPages > 1">
            <button type="button" (click)="load(page - 1)" [disabled]="page === 0 || sending">Previous</button>
            <span>Page {{ page + 1 }} of {{ totalPages }}</span>
            <button type="button" (click)="load(page + 1)" [disabled]="page + 1 >= totalPages || sending">Next</button>
          </div>
        </section>
        <section class="detail" *ngIf="selected as item">
          <h2>{{ item.name }}</h2><p>{{ item.email }} · {{ item.createdAt | date:'medium' }}</p>
          <p class="body">{{ item.message }}</p>
          <div *ngIf="item.repliedAt; else replyForm">
            <h3>Reply sent {{ item.repliedAt | date:'medium' }}</h3>
            <strong>{{ item.replySubject }}</strong><p class="body">{{ item.replyMessage }}</p>
          </div>
          <ng-template #replyForm>
            <form (ngSubmit)="reply()" #form="ngForm">
              <h3>Reply by email</h3>
              <label for="contact-subject">Subject</label>
              <input id="contact-subject" name="subject" [(ngModel)]="subject" maxlength="200" required [disabled]="sending">
              <label for="contact-reply">Message</label>
              <textarea id="contact-reply" name="message" [(ngModel)]="replyMessage" maxlength="5000" rows="8" required [disabled]="sending"></textarea>
              <button class="send" type="submit" [disabled]="sending || form.invalid || !subject.trim() || !replyMessage.trim()">
                {{ sending ? 'Sending...' : 'Send reply' }}</button>
            </form>
          </ng-template>
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;color:#182231}.inbox{max-width:1200px;margin:auto;padding:2.5rem 2rem}
    header h1{margin:.25rem 0}header>p:last-child{color:#607287}.eyebrow{font-size:.7rem;font-weight:800;letter-spacing:.1em;color:#72869a}
    .workspace{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:1rem;margin-top:2rem}
    .list,.detail{background:#fff;border:1px solid #e0e8f0;border-radius:12px;padding:1.25rem;min-width:0}
    .message-button{display:grid;gap:.3rem;width:100%;text-align:left;border:0;border-radius:8px;padding:.8rem;background:transparent}
    .message-button span{font-size:.85rem;color:#607287}.message-button.active{background:#e8f1fa}
    .detail p,.detail strong{overflow-wrap:anywhere}.body{white-space:pre-wrap;padding:1rem;background:#f5f8fb;border-radius:8px}
    label{display:block;font-weight:600;margin:1rem 0 .4rem}input,textarea{width:100%;box-sizing:border-box;border:1px solid #cbd7e3;border-radius:7px;padding:.7rem}
    textarea{resize:vertical}.send{margin-top:1rem;background:#234e78;color:white;border:0;border-radius:7px;padding:.75rem 1rem}
    button:disabled{opacity:.55}.pagination{display:flex;align-items:center;justify-content:space-between;gap:.4rem;margin-top:1rem;font-size:.85rem}
    .alert,.success{padding:1rem;border-radius:8px;background:#fff2f2;color:#8c2929}.success{background:#eaf7ed;color:#24603a}
    button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #74b7f9;outline-offset:2px}
    @media(max-width:650px){.inbox{padding:1.5rem 1rem}.workspace{grid-template-columns:1fr}}
  `]
})
export class ContactMessagesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly url = `${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api/admin/contact-messages`;
  messages: ContactMessage[] = [];
  selected: ContactMessage | null = null;
  page = 0;
  totalPages = 0;
  loading = false;
  loadFailed = false;
  sending = false;
  error = '';
  success = '';
  subject = '';
  replyMessage = '';

  ngOnInit(): void { this.load(0); }

  canLeave(): boolean {
    return !this.sending && (!this.hasDraft || confirm('Discard your unsent reply?'));
  }

  private get hasDraft(): boolean {
    return !this.selected?.repliedAt && (!!this.subject.trim() || !!this.replyMessage.trim());
  }

  load(page: number): void {
    if (this.sending || this.loading) return;
    if (page !== this.page && !this.canLeave()) return;
    this.page = page;
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.success = '';
    this.http.get<MessagePage>(this.url, { params: { page, size: 20 } }).subscribe({
      next: result => {
        this.messages = result.content;
        this.page = result.number;
        this.totalPages = result.totalPages;
        this.selected = this.messages[0] ?? null;
        this.subject = '';
        this.replyMessage = '';
        this.loading = false;
      },
      error: () => { this.loading = false; this.loadFailed = true; this.error = 'Could not load messages.'; }
    });
  }

  select(item: ContactMessage): void {
    if (this.sending) return;
    if (this.selected?.id === item.id) return;
    if (!this.canLeave()) return;
    this.selected = item;
    this.subject = '';
    this.replyMessage = '';
    this.error = '';
    this.success = '';
  }

  reply(): void {
    if (!this.selected || this.selected.repliedAt || this.sending || !this.subject.trim() || !this.replyMessage.trim()) return;
    const id = this.selected.id;
    this.sending = true;
    this.error = '';
    this.success = '';
    this.http.post<ContactMessage>(`${this.url}/${id}/reply`, {
      subject: this.subject, message: this.replyMessage
    }).subscribe({
      next: saved => {
        this.messages = this.messages.map(item => item.id === saved.id ? saved : item);
        this.selected = saved;
        this.sending = false;
        this.success = 'Reply sent.';
      },
      error: error => {
        this.sending = false;
        this.error = typeof error.error?.message === 'string' ? error.error.message : 'Could not send reply.';
      }
    });
  }
}
