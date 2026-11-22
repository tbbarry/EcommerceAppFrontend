import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { ProductService } from '../../core/product.service';
import { CatalogResponse } from '../../models/catalogResponse.model';
import { HomeComponent } from './home.component';
import { StoreSettingsService } from '../../core/store-settings.service';
import { MenuService } from '../../core/menu.service';

describe('Page d’accueil', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let service: jasmine.SpyObj<ProductService>;
  let menu: jasmine.SpyObj<MenuService>;
  let changes: Subject<void>;
  const catalog: CatalogResponse = {
    products: [{ id: 1, name: 'Robe', slug: 'robe', price: 39, brand: '', imageUrl: null }],
    categories: [{ id: 7, name: 'Robes', children: [] }],
    facets: [],
    totalProducts: 1,
    page: 0,
    size: 8
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<ProductService>('ProductService', ['getCatalog']);
    service.getCatalog.and.returnValue(of(catalog));
    changes = new Subject<void>();
    menu = jasmine.createSpyObj<MenuService>('MenuService', ['getMenu', 'refresh'], { changes$: changes.asObservable() });
    menu.getMenu.and.returnValue(of([
      { id: 7, name: 'Robes', children: [] }, { id: 8, name: 'Men', children: [] }
    ]));
    menu.refresh.and.callFake(() => changes.next());
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: ProductService, useValue: service },
        { provide: MenuService, useValue: menu },
        { provide: StoreSettingsService, useValue: { name: signal('My Store') } }]
    });
    fixture = TestBed.createComponent(HomeComponent);
  });

  afterEach(() => fixture.destroy());

  it('affiche les produits et les catégories réels avec leurs liens', () => {
    fixture.detectChanges();

    expect(service.getCatalog).toHaveBeenCalledWith({ page: 0, size: 8 });
    expect(fixture.nativeElement.querySelector('.product-card a').getAttribute('href')).toBe('/products/robe');
    expect(fixture.nativeElement.querySelector('.category-card').getAttribute('href')).toBe('/products?categoryId=7');
    expect(fixture.nativeElement.querySelectorAll('.category-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.product-photo .bi-image')).not.toBeNull();
  });

  it('distingue un catalogue vide d’une erreur et permet de réessayer', () => {
    spyOn(console, 'error');
    service.getCatalog.and.returnValues(
      throwError(() => new Error('indisponible')),
      of({ ...catalog, products: [], categories: [] })
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('unavailable');

    fixture.nativeElement.querySelector('.retry-link').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('collection is coming soon');
    expect(fixture.nativeElement.querySelectorAll('.category-card').length).toBe(2);
  });

  it('retries category loading independently of the catalog', () => {
    spyOn(console, 'error');
    menu.getMenu.and.returnValues(throwError(() => new Error('unavailable')),
      of([{ id: 8, name: 'Men', children: [] }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Categories are temporarily unavailable');
    fixture.nativeElement.querySelector('.categories-section button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-card').getAttribute('href')).toBe('/products?categoryId=8');
  });
});
