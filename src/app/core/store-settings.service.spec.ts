import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ErrorInterceptor } from './error.interceptor';
import { JwtInterceptor } from './jwt.interceptor';
import { StoreSettingsService } from './store-settings.service';

describe('Store settings', () => {
  let service: StoreSettingsService;
  let http: HttpTestingController;
  const auth = { token: 'token', logout: jasmine.createSpy('logout') };

  beforeEach(() => {
    auth.logout.calls.reset();
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
      { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
    ] });
    service = TestBed.inject(StoreSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('distinguishes a failed request from a configured name and retries', () => {
    spyOn(console, 'error');
    service.load();
    http.expectOne(request => request.url.endsWith('/api/store-settings'))
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(service.error()).toBeTrue();
    expect(service.name()).toBe('');
    service.load();
    http.expectOne(request => request.url.endsWith('/api/store-settings'))
      .flush({ name: 'New Store', logoVersion: 'abc', aboutText: '', contactText: '', contactEmail: '' });
    expect(service.error()).toBeFalse();
    expect(service.name()).toBe('New Store');
    expect(service.logoUrl()).toContain('/api/store-settings/logo?v=abc');
  });

  it('does not send credentials or log the user out when public settings fail', () => {
    spyOn(console, 'error');
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    service.load();
    const request = http.expectOne(req => req.url.endsWith('/api/store-settings'));
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush('Unavailable', { status: 401, statusText: 'Unauthorized' });
    expect(service.error()).toBeTrue();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('submits public contact messages without sending the login token', () => {
    TestBed.inject(HttpClient).post('/api/contact-messages', {}).subscribe({ error: () => {} });
    const request = http.expectOne('/api/contact-messages');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('reports an incompatible settings response instead of showing invented content', () => {
    spyOn(console, 'error');
    service.load();
    http.expectOne(req => req.url.endsWith('/api/store-settings'))
      .flush({ name: 'Old server', logoVersion: null });
    expect(service.error()).toBeTrue();
    expect(service.settings()).toBeNull();
  });
});
