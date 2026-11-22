import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductAdminDetailResponse } from '../../models/admin-product.model';
import { AdminProductDetailComponent } from './product-detail.component';

describe('Gestion du produit administrateur', () => {
  let fixture: ComponentFixture<AdminProductDetailComponent>;
  let component: AdminProductDetailComponent;
  let http: HttpTestingController;

  const product: ProductAdminDetailResponse = {
    id: 1, name: 'Produit', description: 'Description', brand: 'Marque', slug: 'produit',
    price: 10, categoryId: 3, categoryName: 'Catégorie', status: 'ACTIVE',
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
    variants: [
      {
        id: 101, sku: 'ROUGE-M', price: 10, createdAt: '', updatedAt: '',
        stock: { id: 1, quantity: 5, reservedQuantity: 2, availableQuantity: 3, createdAt: '', updatedAt: '' },
        attributeValues: [{ id: 1, attributeId: 1, attributeName: 'Couleur', attributeValueId: 12, attributeValueName: 'Rouge', createdAt: '', updatedAt: '' }]
      },
      { id: 102, sku: 'BLEU-L', price: 12, createdAt: '', updatedAt: '', attributeValues: [] }
    ],
    images: [
      { id: 201, url: 'https://example.com/a.jpg', alt: 'Face', main: true, displayOrder: 0, createdAt: '', updatedAt: '' },
      { id: 202, url: 'https://example.com/b.jpg', alt: 'Dos', main: false, displayOrder: 1, createdAt: '', updatedAt: '' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminProductDetailComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/admin/products/1').flush(product);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('creates a variant using selected attributes and reloads the product', () => {
    component.editVariant();
    http.expectOne('/api/attributes/with-values').flush([
      { id: 1, name: 'Couleur', values: [{ id: 12, value: 'Rouge' }] }
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#attribute-1')).not.toBeNull();
    component.variantForm.setValue({ price: 20, quantity: 4 });
    component.attributeControls.controls['1'].setValue(12);
    component.saveVariant();

    const request = http.expectOne('/api/admin/products/1/variants');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ price: 20, quantity: 4, attributeValueIds: [12] });
    request.flush({});
    expect(component.busy).toBeTrue();
    http.expectOne('/api/admin/products/1').flush(product);
    expect(component.busy).toBeFalse();
    expect(component.editor).toBeNull();
  });

  it('shows backend errors and preserves the edit form for retry', () => {
    component.editProduct();
    http.expectOne('/api/categories').flush([{ id: 3, name: 'Catégorie', children: [] }]);
    component.productForm.controls.name.setValue('Nouveau nom');
    component.productForm.controls.name.markAsDirty();
    component.saveProduct();
    http.expectOne('/api/admin/products/1').flush(
      { message: 'Modification refusée' }, { status: 409, statusText: 'Conflict' }
    );
    expect(component.errorMessage).toContain('Modification refusée');
    expect(component.editor).toBe('product');
    expect(component.productForm.controls.name.value).toBe('Nouveau nom');
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('updates product information with the selected category', () => {
    component.editProduct();
    http.expectOne('/api/categories').flush([{ id: 3, name: 'Catégorie', children: [{ id: 4, name: 'Enfant' }] }]);
    component.productForm.patchValue({ name: 'Nouveau', categoryId: 4, price: 15 });
    component.saveProduct();
    const request = http.expectOne('/api/admin/products/1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Nouveau', description: 'Description', brand: 'Marque', categoryId: 4, price: 15
    });
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('confirms bulk deletion and submits selected ids together', () => {
    const confirmation = spyOn(window, 'confirm').and.returnValue(false);
    component.toggleAllVariants(true);
    component.deleteSelectedVariants();
    http.expectNone('/api/admin/products/1/variants/bulk-delete');
    confirmation.and.returnValue(true);
    component.deleteSelectedVariants();
    expect(confirmation.calls.mostRecent().args[0]).toContain('ROUGE-M');
    expect(confirmation.calls.mostRecent().args[0]).toContain('BLEU-L');
    const request = http.expectOne('/api/admin/products/1/variants/bulk-delete');
    expect(request.request.body).toEqual({ variantIds: [101, 102] });
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(product);
    expect(component.selectedVariantIds.size).toBe(0);
  });

  it('prevents reducing stock below the reserved quantity', () => {
    component.editStock(product.variants[0]);
    component.stockForm.controls.quantity.setValue(1);
    component.saveStock();
    http.expectNone('/api/admin/products/1/variants/101/stock');
    component.stockForm.controls.quantity.setValue(3);
    component.saveStock();
    const request = http.expectOne('/api/admin/products/1/variants/101/stock');
    expect(request.request.body).toEqual({ quantity: 3 });
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('requires another main image before deleting the current one', () => {
    component.deleteImage(product.images[0]);
    expect(component.errorMessage).toContain('autre image principale');
    http.expectNone('/api/admin/products/1/images/201');
    component.setMainImage(product.images[1]);
    const request = http.expectOne('/api/admin/products/1/images/202');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ isMain: true });
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('updates image metadata without resending the URL', () => {
    component.editImage(product.images[1]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#image-url').disabled).toBeTrue();
    component.imageForm.patchValue({ displayOrder: 2, visualAttributeValueId: 12 });
    component.saveImage();
    const request = http.expectOne('/api/admin/products/1/images/202');
    expect(request.request.body).toEqual({ displayOrder: 2, isMain: false, visualAttributeValueId: 12 });
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('adds an external image using multipart form data', () => {
    component.editImage();
    component.imageForm.controls.mode.setValue('url');
    component.changeImageMode();
    component.imageForm.patchValue({
      url: 'https://example.com/new.jpg', displayOrder: 2,
      isMain: false, visualAttributeValueId: 12
    });
    component.saveImage();
    const request = http.expectOne('/api/admin/products/1/images');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.has('Content-Type')).toBeFalse();
    const body = request.request.body as FormData;
    expect(body.get('url')).toBe('https://example.com/new.jpg');
    expect(body.get('file')).toBeNull();
    expect(body.get('alt')).toBeNull();
    expect(body.get('displayOrder')).toBe('2');
    expect(body.get('main')).toBe('false');
    expect(body.get('visualAttributeValueId')).toBe('12');
    request.flush({});
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('uploads a file with a preview and releases it after success', () => {
    const createUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:preview');
    const revokeUrl = spyOn(URL, 'revokeObjectURL');
    component.editImage();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#image-file');
    const file = new File(['image'], 'produit.webp', { type: 'image/webp' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    expect(createUrl).toHaveBeenCalledWith(file);
    expect(component.imagePreview).toBe('blob:preview');
    expect(component.hasUnsavedChanges).toBeTrue();
    component.imageForm.patchValue({ isMain: true, displayOrder: 1 });
    component.saveImage();

    const request = http.expectOne('/api/admin/products/1/images');
    const body = request.request.body as FormData;
    expect(request.request.headers.has('Content-Type')).toBeFalse();
    expect(body.get('file')).toEqual(file);
    expect(body.get('url')).toBeNull();
    expect(body.get('alt')).toBeNull();
    expect(body.get('main')).toBe('true');
    expect(body.get('displayOrder')).toBe('1');
    expect(body.has('visualAttributeValueId')).toBeFalse();
    request.flush({ id: 203, url: 'product_1/image.webp', main: true, alt: 'Vue de face', displayOrder: 1 });
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('switches modes, clears the previous source and releases its preview', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:preview');
    const revokeUrl = spyOn(URL, 'revokeObjectURL');
    component.editImage();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#image-file');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['image'], 'photo.jpg', { type: 'image/jpeg' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const urlMode: HTMLInputElement = fixture.nativeElement.querySelector('#image-mode-url');
    urlMode.click();
    fixture.detectChanges();
    expect(component.imageForm.controls.mode.value).toBe('url');
    expect(component.imageForm.controls.file.disabled).toBeTrue();
    expect(component.imageForm.controls.file.value).toBeNull();
    expect(component.imageForm.controls.url.enabled).toBeTrue();
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
    expect(component.imagePreview).toBe('');
  });

  it('rejects unsupported and oversized files without sending a request', () => {
    component.editImage();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#image-file');
    const chooseFile = (file: File): void => {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    };
    chooseFile(new File(['x'], 'image.svg', { type: 'image/svg+xml' }));
    expect(component.imageForm.controls.file.hasError('imageType')).toBeTrue();
    component.saveImage();
    http.expectNone('/api/admin/products/1/images');

    chooseFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(component.imageForm.controls.file.hasError('imageSize')).toBeTrue();
    component.saveImage();
    http.expectNone('/api/admin/products/1/images');

    chooseFile(new File([new Uint8Array(10 * 1024 * 1024)], 'limit.gif', { type: 'image/gif' }));
    expect(component.imageForm.controls.file.valid).toBeTrue();
    expect(component.imagePreview).toMatch(/^blob:/);
  });

  it('resolves stored image paths without altering external image URLs', () => {
    const withStoredImage: ProductAdminDetailResponse = {
      ...product,
      images: [
        { ...product.images[0], url: 'product_1/photo.jpg' },
        product.images[1]
      ]
    };
    component.product = withStoredImage;
    fixture.detectChanges();
    const images = fixture.nativeElement.querySelectorAll('.product-image') as NodeListOf<HTMLImageElement>;
    expect(images[0].getAttribute('src')).toBe('/api/images/products/product_1/photo.jpg');
    expect(images[1].getAttribute('src')).toBe('https://example.com/b.jpg');
    component.editImage(withStoredImage.images[0]);
    expect(component.imagePreview).toBe('/api/images/products/product_1/photo.jpg');
  });

  it('does not delete the only main image', () => {
    component.product = { ...product, images: [product.images[0]] };
    component.deleteImage(product.images[0]);
    expect(component.errorMessage).toContain('seule image principale');
    http.expectNone('/api/admin/products/1/images/201');
  });

  it('deletes one variant with DELETE after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.deleteVariants([product.variants[0]]);
    const request = http.expectOne('/api/admin/products/1/variants/101');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(product);
  });

  it('warns before leaving dirty forms and does not lose missing attributes', () => {
    component.editVariant(product.variants[0]);
    http.expectOne('/api/attributes/with-values').flush([]);
    expect(component.editor).toBeNull();
    expect(component.errorMessage).toContain('attributs');

    component.editProduct();
    http.expectOne('/api/categories').flush([{ id: 3, name: 'Catégorie' }]);
    component.productForm.controls.name.markAsDirty();
    spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave()).toBeFalse();
    component.cancelEditor();
    expect(component.editor).toBe('product');
  });

  it('keeps a successful write visible when the subsequent reload fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.archiveProduct();
    const request = http.expectOne('/api/admin/products/1/status');
    expect(request.request.body).toEqual({ status: 'ARCHIVED' });
    request.flush(null);
    http.expectOne('/api/admin/products/1').flush(null, { status: 503, statusText: 'Unavailable' });
    expect(component.successMessage).toContain('archivé');
    expect(component.errorMessage).toContain('Modification enregistrée');
    expect(component.product).toBeNull();
    component.retryLoad();
    http.expectOne('/api/admin/products/1').flush(product);
    expect(component.product).toEqual(product);
  });
});
