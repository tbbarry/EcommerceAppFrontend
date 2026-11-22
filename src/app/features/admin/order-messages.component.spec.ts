import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StoreSettingsService } from '../../core/store-settings.service';
import { OrderMessagesComponent } from './order-messages.component';

describe('OrderMessagesComponent', () => {
  it('previews variables and saves an edited message', () => {
    TestBed.configureTestingModule({
      imports: [OrderMessagesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const fixture = TestBed.createComponent(OrderMessagesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/admin/order-messages').flush([
      { key: 'SHIPPED', subject: 'Order {{order_number}}', message: 'Hi {{customer_name}}' }
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview').textContent).toContain('Order ORD-1001');
    expect(fixture.nativeElement.querySelector('.preview').textContent).toContain('Hi Alex');
    const component = fixture.componentInstance;
    component.selected!.message = 'Thanks {{customer_name}}';
    component.save();
    const request = http.expectOne('/api/admin/order-messages/SHIPPED');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.message).toBe('Thanks {{customer_name}}');
    request.flush({ key: 'SHIPPED', subject: 'Order {{order_number}}', message: 'Thanks {{customer_name}}' });
    expect(component.dirty).toBeFalse();
    http.verify();
  });

  it('previews account messages without exposing a token and explains the automatic expiry', () => {
    TestBed.configureTestingModule({
      imports: [OrderMessagesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: StoreSettingsService, useValue: { name: signal('Your Store') } }]
    });
    const fixture = TestBed.createComponent(OrderMessagesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/admin/order-messages').flush([
      { key: 'ACCOUNT_ACTIVATION', subject: 'Activate {{user_name}} - {{site_name}}',
        message: 'Welcome, {{user_name}} from {{site_name}}.' }
    ]);
    fixture.detectChanges();

    const preview = fixture.nativeElement.querySelector('.preview') as HTMLElement;
    expect(preview.textContent).toContain('Activate Alex - Your Store');
    expect(preview.textContent).toContain('Welcome, Alex from Your Store.');
    expect(preview.textContent).toContain('expires in 24 hours');
    expect(preview.textContent).toContain('No real token is shown');
    expect(preview.textContent).not.toContain('token=');
    http.verify();
  });
});
