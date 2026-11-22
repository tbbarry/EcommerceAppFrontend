import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuService } from '../../core/menu.service';
import { TaxonomyManagementComponent } from './taxonomy-management.component';

describe('Gestion des catégories et attributs', () => {
  let fixture: ComponentFixture<TaxonomyManagementComponent>;
  let component: TaxonomyManagementComponent;
  let http: HttpTestingController;
  const tree = [{ id: 1, name: 'Femme', description: 'Mode femme', displayOrder: 1, children: [
    { id: 2, name: 'Robes', description: 'Robes', displayOrder: 0, children: [] }
  ] }];
  const attributes = [{ id: 5, name: 'Couleur', values: [{ id: 6, value: 'Rouge' }] }];

  function flushLists(): void {
    http.expectOne('/api/categories').flush(tree);
    http.expectOne('/api/attributes/with-values').flush(attributes);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaxonomyManagementComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TaxonomyManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushLists();
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); http.verify(); });

  it('saves the chosen order and refreshes the navigation', () => {
    const refresh = spyOn(TestBed.inject(MenuService), 'refresh');
    component.openCategory();
    component.categoryForm.setValue({ name: ' Homme ', description: ' Hommes ', categoryId: null, displayOrder: 2 });
    component.saveCategory();
    const request = http.expectOne('/api/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Homme', description: 'Hommes', categoryId: null, displayOrder: 2 });
    request.flush({});
    flushLists();
    expect(refresh).toHaveBeenCalled();
    expect(component.editor).toBeNull();
  });

  it('prevents selecting a category or its descendants as its parent', () => {
    component.openCategory(component.rows[0]);
    expect(component.availableParents.length).toBe(0);
    component.openCategory(component.rows[1]);
    expect(component.availableParents.map(row => row.category.id)).toEqual([1]);
  });

  it('creates and edits attribute values with the correct attribute', () => {
    component.switchTab('attributes');
    component.openValue(attributes[0]);
    component.nameForm.setValue({ name: ' Bleu ' });
    component.saveName();
    const create = http.expectOne('/api/attribute-values');
    expect(create.request.body).toEqual({ attributeId: 5, value: 'Bleu' });
    create.flush({});
    flushLists();
    component.openValue(attributes[0], attributes[0].values[0]);
    component.nameForm.setValue({ name: 'Bordeaux' });
    component.saveName();
    const update = http.expectOne('/api/attribute-values/6');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ attributeId: 5, value: 'Bordeaux' });
    update.flush({});
    flushLists();
  });

  it('confirms deletion and shows the backend error without losing data', () => {
    const confirmation = spyOn(window, 'confirm').and.returnValue(false);
    component.deleteCategory(component.rows[0]);
    http.expectNone('/api/categories/1');
    confirmation.and.returnValue(true);
    component.deleteCategory(component.rows[0]);
    http.expectOne('/api/categories/1').flush({ message: 'Catégorie utilisée' }, { status: 400, statusText: 'Bad Request' });
    expect(component.errorMessage).toContain('Catégorie utilisée');
    expect(component.rows.length).toBe(2);
  });

  it('protects unsaved changes and requests in progress', () => {
    component.openCategory();
    component.categoryForm.markAsDirty();
    spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    component.categoryForm.setValue({ name: 'Homme', description: 'Homme', categoryId: null, displayOrder: 2 });
    component.saveCategory();
    expect(component.canLeave()).toBeFalse();
    http.expectOne('/api/categories').flush({});
    flushLists();
  });
});
