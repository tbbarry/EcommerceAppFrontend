import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { MenuService } from '../../core/menu.service';
import { StoreSettingsService } from '../../core/store-settings.service';
import { FooterComponent } from './footer.component';

describe('Footer navigation', () => {
  it('updates category links from the same menu data and links to information pages', () => {
    const changes = new Subject<void>();
    let categories = [{ id: 1, name: 'Women', children: [] }];
    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([]),
        { provide: StoreSettingsService, useValue: { name: signal('Store') } },
        { provide: MenuService, useValue: { changes$: changes.asObservable(), getMenu: () => of(categories) } }]
    });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/products?categoryId=1"]')).not.toBeNull();
    categories = [{ id: 2, name: 'Men', children: [] }];
    changes.next();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/products?categoryId=1"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/products?categoryId=2"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/about"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/contact"]')).not.toBeNull();
  });
});
