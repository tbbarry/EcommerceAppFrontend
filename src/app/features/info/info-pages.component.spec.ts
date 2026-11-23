import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { StoreSettingsService } from '../../core/store-settings.service';
import { AboutComponent } from './about.component';
import { ContactComponent } from './contact.component';

describe('Store information pages', () => {
  const settings = signal({
    name: 'My Store', logoVersion: null, aboutText: 'A <script>story</script>',
    contactText: 'We are here to help.', contactEmail: 'hello@example.test'
  });

  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: StoreSettingsService, useValue: { name: () => settings().name, settings, error: signal(false) } }]
  }));

  it('displays configured content as text, not markup', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A <script>story</script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
  });

  it('preserves a failed message and clears it only after successful submission', fakeAsync(() => {
    const fixture = TestBed.createComponent(ContactComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    tick();
    fixture.componentInstance.name = 'Alex';
    fixture.componentInstance.email = 'alex@example.test';
    fixture.componentInstance.message = 'Please help.';
    fixture.detectChanges();
    tick();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    fixture.componentInstance.send(form);
    const first = http.expectOne('/api/contact-messages');
    expect(first.request.body).toEqual({ name: 'Alex', email: 'alex@example.test', message: 'Please help.' });
    first.flush('Busy', { status: 429, statusText: 'Too Many Requests' });
    expect(fixture.componentInstance.error).toContain('Too many messages');
    expect(fixture.componentInstance.message).toBe('Please help.');
    fixture.componentInstance.send(form);
    http.expectOne('/api/contact-messages').flush(null);
    tick();
    expect(fixture.componentInstance.success).toBeTrue();
    expect(fixture.componentInstance.message).toBe('');
    http.verify();
  }));
});
