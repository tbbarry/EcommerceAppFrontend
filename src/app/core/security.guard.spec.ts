import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { adminGuard } from './admin.guard';
import { AuthService, User } from './auth.service';
import { ActivatedRouteSnapshot } from '@angular/router';

describe('adminGuard', () => {
  let auth: { isLoggedIn: jasmine.Spy; refreshProfile: jasmine.Spy };
  let router: Router;
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/admin/products' } as RouterStateSnapshot;

  beforeEach(() => {
    auth = { isLoggedIn: jasmine.createSpy().and.returnValue(true), refreshProfile: jasmine.createSpy() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    });
    router = TestBed.inject(Router);
  });

  it('only admits an administrator whose password has been changed', async () => {
    auth.refreshProfile.and.returnValue(of({ role: 'ADMIN', mustChangePassword: false } satisfies User));
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    if (!isObservable(result)) throw new Error('Expected asynchronous guard');
    expect(await firstValueFrom(result)).toBeTrue();
  });

  it('redirects an administrator with a temporary password to the profile', async () => {
    auth.refreshProfile.and.returnValue(of({ role: 'ADMIN', mustChangePassword: true } satisfies User));
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    if (!isObservable(result)) throw new Error('Expected asynchronous guard');
    const target = await firstValueFrom(result);
    if (!(target instanceof UrlTree)) throw new Error('Expected redirect');
    expect(router.serializeUrl(target)).toBe('/account/profile');
  });

  it('does not trust stale roles when the server cannot verify the profile', async () => {
    auth.refreshProfile.and.returnValue(throwError(() => new Error('unavailable')));
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    if (!isObservable(result)) throw new Error('Expected asynchronous guard');
    const target = await firstValueFrom(result);
    if (!(target instanceof UrlTree)) throw new Error('Expected redirect');
    expect(router.serializeUrl(target)).toContain('/auth/login');
  });
});
