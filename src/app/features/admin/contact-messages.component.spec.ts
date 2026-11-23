import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContactMessagesComponent } from './contact-messages.component';

describe('ContactMessagesComponent', () => {
  const message = { id: 1, name: 'Alex', email: 'alex@example.com', message: 'Hello',
    createdAt: '2026-01-01T12:00:00', repliedAt: null, replySubject: null, replyMessage: null };
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ContactMessagesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists messages and preserves the draft on delivery failure', () => {
    const fixture = TestBed.createComponent(ContactMessagesComponent);
    fixture.detectChanges();
    http.expectOne(req => req.url.endsWith('/api/admin/contact-messages')).flush({
      content: [message], number: 0, totalPages: 1
    });
    const component = fixture.componentInstance;
    component.subject = 'Hello';
    component.replyMessage = 'Our reply';
    component.reply();
    const request = http.expectOne(req => req.url.endsWith('/1/reply'));
    expect(request.request.body).toEqual({ subject: 'Hello', message: 'Our reply' });
    request.flush({ message: 'Email delivery failed. Please try again.' }, { status: 502, statusText: 'Bad Gateway' });
    expect(component.error).toContain('delivery failed');
    expect(component.replyMessage).toBe('Our reply');
    expect(component.selected?.repliedAt).toBeNull();
    component.reply();
    http.expectOne(req => req.url.endsWith('/1/reply')).flush({
      ...message, repliedAt: '2026-01-01T13:00:00', replySubject: 'Hello', replyMessage: 'Our reply'
    });
    expect(component.selected?.repliedAt).toBeTruthy();
    component.reply();
  });

  it('shows a retryable list error', () => {
    const fixture = TestBed.createComponent(ContactMessagesComponent);
    fixture.detectChanges();
    http.expectOne(req => req.url.endsWith('/api/admin/contact-messages'))
      .flush({}, { status: 500, statusText: 'Error' });
    expect(fixture.componentInstance.loadFailed).toBeTrue();
    fixture.componentInstance.load(0);
    http.expectOne(req => req.url.endsWith('/api/admin/contact-messages'))
      .flush({ content: [], number: 0, totalPages: 0 });
    expect(fixture.componentInstance.loadFailed).toBeFalse();
  });

  it('protects unsent drafts and pending sends', () => {
    const fixture = TestBed.createComponent(ContactMessagesComponent);
    fixture.detectChanges();
    http.expectOne(req => req.url.endsWith('/api/admin/contact-messages'))
      .flush({ content: [message], number: 0, totalPages: 2 });
    const component = fixture.componentInstance;
    expect(component.canLeave()).toBeTrue();
    component.subject = 'Draft';
    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    component.load(1);
    expect(component.page).toBe(0);
    component.select({ ...message, id: 2 });
    expect(component.selected?.id).toBe(1);
    component.replyMessage = 'Text';
    component.reply();
    expect(component.canLeave()).toBeFalse();
    expect(confirm).toHaveBeenCalled();
    http.expectOne(req => req.url.endsWith('/1/reply')).flush({
      ...message, repliedAt: '2026-01-01T13:00:00', replySubject: 'Draft', replyMessage: 'Text'
    });
    expect(component.canLeave()).toBeTrue();
  });
});
