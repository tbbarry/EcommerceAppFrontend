import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AppComponent } from '../../app.component';
import { routes } from '../../app.routes';
import { AdminOrderService } from '../../core/admin-order.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { MenuService } from '../../core/menu.service';
import { StoreSettingsService } from '../../core/store-settings.service';
import { StoreTitleStrategy } from '../../core/store-title.strategy';

describe('Espaces boutique et administration', () => {
  const auth = {
    initAuthState: jasmine.createSpy('initAuthState'),
    isLoggedIn: jasmine.createSpy('isLoggedIn'),
    refreshProfile: jasmine.createSpy('refreshProfile'),
    logout: jasmine.createSpy('logout'),
    user$: of(null)
  };
  const adminOrders = {
    list: jasmine.createSpy('list'),
    detail: jasmine.createSpy('detail')
  };

  beforeEach(() => {
    auth.isLoggedIn.and.returnValue(true);
    auth.refreshProfile.and.returnValue(of({ role: 'ADMIN', mustChangePassword: false }));
    adminOrders.list.calls.reset();
    adminOrders.detail.calls.reset();
    adminOrders.list.and.returnValue(of({ content: [], number: 0, totalPages: 0, totalElements: 0 }));
    adminOrders.detail.and.returnValue(throwError(() => new Error('test')));
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes), provideHttpClient(), provideHttpClientTesting(),
        { provide: TitleStrategy, useClass: StoreTitleStrategy },
        { provide: StoreSettingsService, useValue: { name: signal('My Store'), logoUrl: signal(null), error: signal(false), load: () => {} } },
        { provide: AuthService, useValue: auth },
        { provide: AdminOrderService, useValue: adminOrders },
        { provide: CartService, useValue: { totalQuantity: () => 0, isEmpty: () => true, cartItems: () => [] } },
        { provide: MenuService, useValue: { changes$: of(), getMenu: () => of([]), refresh: () => {} } }
      ]
    });
  });

  it('uses the admin shell only for administration and keeps the shop shell for customers', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/orders');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-layout')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-navbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-footer')).toBeNull();
    expect(fixture.nativeElement.querySelector('.admin-nav a.active')?.textContent).toContain('Orders');
    expect(fixture.nativeElement.querySelector('.admin-brand').textContent).toContain('My Store');
    expect(TestBed.inject(Title).getTitle()).toBe('Orders | My Store');

    await router.navigateByUrl('/payment-cancel');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-layout')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-navbar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-footer')).not.toBeNull();
  });

  it('keeps administration protected when the user is not logged in', async () => {
    auth.isLoggedIn.and.returnValue(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/orders');
    fixture.detectChanges();
    expect(router.url).toContain('/auth/login');
    expect(fixture.nativeElement.querySelector('app-admin-layout')).toBeNull();
  });

  it('keeps the store link accessible when the sidebar is shorter than its menu', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/orders');
    fixture.detectChanges();
    const sidebar: HTMLElement = fixture.nativeElement.querySelector('.admin-sidebar');
    const menu: HTMLElement = sidebar.querySelector('.admin-nav')!;
    const link: HTMLAnchorElement = sidebar.querySelector('.store-link')!;
    expect(link.getAttribute('href')).toBe('/');
    if (window.matchMedia('(min-width: 901px)').matches) {
      sidebar.style.height = '360px';
      expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight);
      expect(link.getBoundingClientRect().bottom).toBeLessThanOrEqual(sidebar.getBoundingClientRect().bottom);
    }
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    link.click();
    expect(navigate).toHaveBeenCalled();
  });

  it('opens the order from the email link, including when the page is already open', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/orders?orderId=8');
    fixture.detectChanges();
    expect(adminOrders.detail).toHaveBeenCalledWith(8);
    await router.navigateByUrl('/admin/orders?orderId=9');
    fixture.detectChanges();
    expect(adminOrders.detail).toHaveBeenCalledWith(9);
    await router.navigateByUrl('/admin/orders?orderId=invalid');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('requested order number is invalid');
    expect(fixture.nativeElement.querySelector('#order-detail')).toBeNull();
    expect(adminOrders.detail).toHaveBeenCalledTimes(2);
  });
});
