import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AddProductComponent } from './add-product.component';

describe('Ajout de produit', () => {
  it('offers categories at every level and allows returning to an earlier step', () => {
    TestBed.configureTestingModule({
      imports: [AddProductComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AddProductComponent);
    fixture.detectChanges();
    http.expectOne('/api/categories').flush([
      { id: 1, name: 'Femme', children: [{ id: 2, name: 'Vêtements', children: [{ id: 3, name: 'Robes', children: [] }] }] }
    ]);
    http.expectOne('/api/attributes/with-values').flush([]);
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('#productCategory option')) as HTMLOptionElement[];
    expect(options.map(option => option.textContent?.trim())).toContain('Femme / Vêtements / Robes');
    expect(options.map(option => option.textContent?.trim())).toContain('Femme');
    fixture.componentInstance.currentStep = 3;
    fixture.detectChanges();
    const firstStep: HTMLButtonElement = fixture.nativeElement.querySelector('.product-steps button');
    firstStep.click();
    expect(fixture.componentInstance.currentStep).toBe(1);
    fixture.destroy();
    http.verify();
  });

  it('sends variant attributes and image data without user-provided identifiers or alt text', () => {
    TestBed.configureTestingModule({
      imports: [AddProductComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AddProductComponent);
    fixture.detectChanges();
    http.expectOne('/api/categories').flush([]);
    http.expectOne('/api/attributes/with-values').flush([]);
    const component = fixture.componentInstance;
    component.productForm.setValue({ name: 'Chemise', description: 'Description', brand: 'Maison', categoryId: 1, price: 10 });
    component.variants = [{ id: '1', price: 10, quantity: 2, attributeValueSelection: [
      { attributeId: 1, attributeValueId: 12, attributeName: 'Couleur', valueName: 'Rouge' }
    ] }];
    component.uploadedImages = [{ id: '1', url: 'data:image/png;base64,eA==', isMain: true, displayOrder: 0, visualAttributeValueId: 12 }];
    component.submitForm();
    const request = http.expectOne('/api/products');
    expect(request.request.body.slug).toBeUndefined();
    expect(request.request.body.variants[0]).toEqual({ price: 10, quantity: 2, attributeValueIds: [{ attributeValueId: 12 }] });
    expect(request.request.body.images[0]).toEqual({ url: 'data:image/png;base64,eA==', isMain: true, displayOrder: 0, visualAttributeValueId: 12 });
    request.flush({ message: 'Erreur de test' }, { status: 400, statusText: 'Bad Request' });
    fixture.destroy();
    http.verify();
  });
});
