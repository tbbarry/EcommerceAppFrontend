import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ProductService } from '../../core/product.service';
import { ProductListComponent } from './product-list.component';

describe('Filtres du catalogue', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let routeParams: BehaviorSubject<Record<string, string>>;

  beforeEach(() => {
    routeParams = new BehaviorSubject<Record<string, string>>({});
    TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: routeParams } },
        {
          provide: ProductService,
          useValue: {
            getCatalog: () => of({
              products: [],
              categories: [
                { id: 1, name: 'Femme', children: [{ id: 11, name: 'Vêtements', children: [] }, { id: 12, name: 'Chaussures', children: [] }] },
                { id: 2, name: 'Homme', children: [{ id: 21, name: 'Vêtements', children: [] }] },
                { id: 3, name: 'Enfant', children: [] }
              ],
              facets: Array.from({ length: 5 }, (_, index) => ({
                id: index + 1,
                code: `Filtre ${index + 1}`,
                values: Array.from({ length: 4 }, (_, value) => ({
                  id: value + 1, label: `Option ${value + 1}`, selected: false
                }))
              }))
            })
          }
        }
      ]
    });
    fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('applies search terms passed from the main menu', () => {
    const search = spyOn(TestBed.inject(ProductService), 'getCatalog').and.callThrough();
    routeParams.next({ query: 'robe' });
    expect(search).toHaveBeenCalledWith(jasmine.objectContaining({ query: 'robe' }));
    expect(fixture.componentInstance.searchForm.controls.query.value).toBe('robe');
  });

  it('keeps every open filter at its full height in a constrained scrolling panel', () => {
    const aside: HTMLElement = fixture.nativeElement.querySelector('aside');
    const sidebar: HTMLElement = fixture.nativeElement.querySelector('.filter-sidebar');
    aside.style.display = 'block';
    sidebar.style.height = '240px';
    sidebar.style.overflowY = 'auto';
    fixture.detectChanges();

    const cards = Array.from(sidebar.querySelectorAll<HTMLElement>('.facet-card'));
    expect(cards.length).toBe(5);
    expect(sidebar.scrollHeight).toBeGreaterThan(sidebar.clientHeight);
    cards.forEach((card) => {
      expect(card.clientHeight).withContext(card.textContent ?? '').toBeGreaterThanOrEqual(card.scrollHeight - 1);
      expect(card.querySelectorAll('.filter-option').length).toBe(4);
    });

    sidebar.scrollTop = sidebar.scrollHeight;
    const lastCard = cards[cards.length - 1];
    expect(lastCard.getBoundingClientRect().bottom).toBeLessThanOrEqual(sidebar.getBoundingClientRect().bottom + 1);
  });

  it('still selects a facet when its checkbox is clicked', () => {
    spyOn(fixture.componentInstance, 'applyFilters');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.facet-card .filter-option input');
    checkbox.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.facets[0].values[0].selected).toBeTrue();
    expect(fixture.componentInstance.selectedFacetValues.get(1)).toEqual([1]);
  });

  it('keeps collapsed categories compact and expands their options', () => {
    const aside: HTMLElement = fixture.nativeElement.querySelector('aside');
    aside.style.display = 'block';
    const parents = fixture.nativeElement.querySelectorAll('.category-parent') as NodeListOf<HTMLElement>;
    expect(parents[1].getBoundingClientRect().height).toBeLessThan(64);
    expect(parents[1].getBoundingClientRect().height).toBeGreaterThanOrEqual(44);

    const toggle: HTMLButtonElement = parents[0].querySelector('.category-parent-toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(parents[0].querySelectorAll('.category-child').length).toBe(2);
  });

  it('offers image enlargement without a misleading cart action', () => {
    fixture.componentInstance.products2 = [{
      id: 1, name: 'Produit exemple', slug: 'produit-exemple', brand: 'Marque',
      price: 25, imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    }];
    fixture.detectChanges();

    const card: HTMLElement = fixture.nativeElement.querySelector('.product-card');
    const zoomButton = card.querySelector<HTMLButtonElement>('.product-image-zoom');
    const productLink = card.querySelector<HTMLAnchorElement>('.product-image-link');
    expect(zoomButton?.getAttribute('aria-label')).toContain('Produit exemple');
    expect(productLink?.getAttribute('href')).toBe('/products/produit-exemple');
    expect(card.querySelector<HTMLAnchorElement>('.product-title a')?.getAttribute('href')).toBe('/products/produit-exemple');
    expect(card.textContent).not.toContain('View product');
    expect(card.querySelector('.action-cart')).toBeNull();
    expect(card.textContent).not.toContain('Catalog pick');

    zoomButton!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.isCatalogImageViewerOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('.catalog-image-viewer-photo').getAttribute('src'))
      .toBe(fixture.componentInstance.products2[0].imageUrl);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.isCatalogImageViewerOpen).toBeFalse();
  });

  for (const width of [320, 390]) {
    it(`fits long product names and promotional prices at ${width}px`, () => {
      fixture.componentInstance.products2 = [{
        id: 1, name: 'Chaussure de sport pour toute la famille', slug: 'chaussure', brand: 'Marque',
        price: 79.99, basePriceMin: 79.99, basePriceMax: 99,
        finalPriceMin: 51.99, finalPriceMax: 89, hasDiscount: true,
        promoScope: 'VARIANT', discountPercentMin: 10, discountPercentMax: 35,
        imageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      }];
      fixture.detectChanges();
      const frame = document.createElement('iframe');
      frame.style.width = `${width}px`;
      frame.style.height = '600px';
      frame.style.position = 'absolute';
      document.body.appendChild(frame);

      try {
        const doc = frame.contentDocument;
        if (!doc) throw new Error('Impossible de créer la fenêtre de test.');
        const styles = doc.createElement('style');
        styles.textContent = `
          * { box-sizing: border-box; }
          body { margin: 0; }
          .row { display: flex; flex-wrap: wrap; }
          .row > * { flex-shrink: 0; width: 100%; max-width: 100%; }
          .row > .col-6 { width: 50%; padding: 0 8px; }
        ` + Array.from(document.querySelectorAll('style')).map((style) => style.textContent).join('\n');
        doc.head.appendChild(styles);
        const page = fixture.nativeElement.cloneNode(true) as HTMLElement;
        doc.body.appendChild(page);
        const details = page.querySelector<HTMLElement>('.product-details');
        const price = page.querySelector<HTMLElement>('.price-display');
        if (!details || !price) throw new Error('Carte produit introuvable.');
        expect(details.scrollWidth).toBeLessThanOrEqual(details.clientWidth + 1);
        expect(price.scrollWidth).toBeLessThanOrEqual(price.clientWidth + 1);
        expect(page.querySelector('.product-title')?.textContent).toContain('toute la famille');
      } finally {
        frame.remove();
      }
    });
  }

  for (const width of [1440, 1024, 390]) {
    it(`keeps filters visible and scrollable at ${width}px`, () => {
      const frame = document.createElement('iframe');
      frame.style.width = `${width}px`;
      frame.style.height = '600px';
      frame.style.position = 'absolute';
      document.body.appendChild(frame);

      try {
        const doc = frame.contentDocument;
        if (!doc) throw new Error('Impossible de créer la fenêtre de test.');
        const styles = doc.createElement('style');
        styles.textContent = `
          * { box-sizing: border-box; }
          body { margin: 0; }
          .row { display: flex; flex-wrap: wrap; }
          .row > * { flex-shrink: 0; width: 100%; max-width: 100%; }
          @media (min-width: 992px) { .col-lg-4 { width: 33.3333%; } .col-lg-8 { width: 66.6667%; } }
          @media (min-width: 1200px) { .d-xl-none { display: none !important; } }
        ` + Array.from(document.querySelectorAll('style')).map((style) => style.textContent).join('\n');
        doc.head.appendChild(styles);
        const page = fixture.nativeElement.cloneNode(true) as HTMLElement;
        doc.body.appendChild(page);
        const aside = page.querySelector<HTMLElement>('aside');
        const sidebar = page.querySelector<HTMLElement>('.filter-sidebar');
        const results = page.querySelector<HTMLElement>('.catalog-results');
        if (!aside || !sidebar || !results) throw new Error('Filtres du catalogue introuvables.');
        aside.classList.add('mobile-filters-open');

        const computed = frame.contentWindow?.getComputedStyle(aside);
        expect(computed?.display).toBe(width < 1200 ? 'flex' : 'block');
        if (width < 1200) {
          expect(results.getBoundingClientRect().width).toBeCloseTo(results.parentElement!.getBoundingClientRect().width, 0);
        }
        expect(sidebar.scrollHeight).toBeGreaterThan(sidebar.clientHeight);
        const collapsedCategory = page.querySelector<HTMLElement>('.category-parent');
        if (!collapsedCategory) throw new Error('Catégorie introuvable.');
        expect(collapsedCategory.getBoundingClientRect().height).withContext(`${width}px`)
          .toBeLessThan(64);
        expect(collapsedCategory.getBoundingClientRect().height).withContext(`${width}px`)
          .toBeGreaterThanOrEqual(44);
        const cards = Array.from(sidebar.querySelectorAll<HTMLElement>('.facet-card'));
        cards.forEach((card) => {
          expect(card.clientHeight).withContext(`${width}px: ${card.textContent}`).toBeGreaterThanOrEqual(card.scrollHeight - 1);
        });
        sidebar.scrollTop = sidebar.scrollHeight;
        expect(cards[cards.length - 1].getBoundingClientRect().bottom)
          .toBeLessThanOrEqual(sidebar.getBoundingClientRect().bottom + 1);
        if (width < 1200) {
          const actions = page.querySelector<HTMLElement>('.mobile-filters-actions');
          if (!actions) throw new Error('Actions des filtres introuvables.');
          expect(cards[cards.length - 1].getBoundingClientRect().bottom)
            .toBeLessThanOrEqual(actions.getBoundingClientRect().top + 1);
        }
      } finally {
        frame.remove();
      }
    });
  }
});
