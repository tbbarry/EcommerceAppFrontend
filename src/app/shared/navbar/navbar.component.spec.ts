import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService, User } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { MenuService } from '../../core/menu.service';
import { NavbarComponent } from './navbar.component';
import { StoreSettingsService } from '../../core/store-settings.service';

describe('Navigation principale', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let user$: BehaviorSubject<User | null>;
  const categories = [{ id: 1, name: 'Femme', children: [
    { id: 2, name: 'Vêtements', children: [{ id: 3, name: 'Robes', children: [] }] }
  ] }];

  beforeEach(() => {
    user$ = new BehaviorSubject<User | null>(null);
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: StoreSettingsService, useValue: { name: signal('My Store'), logoUrl: signal('/logo.png') } },
        { provide: AuthService, useValue: { user$, logout: () => {} } },
        { provide: CartService, useValue: { totalQuantity: () => 0, isEmpty: () => true, cartItems: () => [] } },
        { provide: MenuService, useValue: { changes$: of(), getMenu: () => of(categories), refresh: () => {} } }
      ]
    });
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('expands nested mobile categories and closes using escape', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    const expand: HTMLButtonElement = fixture.nativeElement.querySelector('.category-expand');
    expand.click();
    fixture.detectChanges();
    const childExpand: HTMLButtonElement = fixture.nativeElement.querySelector('.mobile-nav-children .category-expand');
    childExpand.click();
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('.mobile-nav-parent'));
    expect(links.some(link => link.getAttribute('href') === '/products?categoryId=3')).toBeTrue();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isMobileMenuOpen).toBeFalse();
    expect(document.body.classList.contains('mobile-nav-active')).toBeFalse();
  });

  it('sends search terms to the catalog', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.searchQuery = '  robe  ';
    component.search();
    expect(navigate).toHaveBeenCalledWith(['/products'], { queryParams: { query: 'robe' } });
  });

  it('displays the configured brand and compact logo', () => {
    expect(fixture.nativeElement.querySelector('.logo .sitename').textContent).toContain('My Store');
    expect(fixture.nativeElement.querySelector('.store-logo').getAttribute('src')).toBe('/logo.png');
  });

  it('only shows administration to administrators', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.admin-dropdown')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-admin-menu')).toBeNull();
    user$.next({ role: 'CUSTOMER' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.admin-dropdown')).toBeNull();
    user$.next({ role: 'ADMIN' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.admin-dropdown')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-admin-menu')).not.toBeNull();
  });
});
