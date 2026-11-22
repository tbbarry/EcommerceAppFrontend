import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MegaMenuComponent } from './mega-menu.component';

describe('MegaMenuComponent', () => {
  let fixture: ComponentFixture<MegaMenuComponent>;
  let component: MegaMenuComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MegaMenuComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(MegaMenuComponent);
    component = fixture.componentInstance;
    component.categories = [{ id: 1, name: 'Femme', children: [
      { id: 2, name: 'Vêtements', children: [{ id: 3, name: 'Robes', children: [
        { id: 4, name: 'Longues', children: [] }
      ] }] }
    ] }, { id: 5, name: 'Accessoires', children: [] }];
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('opens on click and exposes links at every depth', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.mega-category-trigger');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('.custom-mega-menu a'));
    expect(links.some(link => link.getAttribute('href') === '/products?categoryId=4')).toBeTrue();
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps a hovered menu open on first click and closes on escape or pointer exit', () => {
    component.showMegaMenu(component.categories[0]);
    component.toggleMegaMenu(component.categories[0]);
    expect(component.activeCategory?.id).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.activeCategory).toBeNull();
    component.showMegaMenu(component.categories[0]);
    fixture.nativeElement.querySelector('nav').dispatchEvent(new MouseEvent('mouseleave'));
    expect(component.activeCategory).toBeNull();
  });
});
