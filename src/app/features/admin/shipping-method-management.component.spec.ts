import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ShippingMethod, ShippingMethodService } from '../../core/shipping-method.service';
import { ShippingMethodManagementComponent } from './shipping-method-management.component';

describe('Gestion des modes de livraison', () => {
  let service: jasmine.SpyObj<ShippingMethodService>;
  const method: ShippingMethod = {
    id: 1, name: 'Standard', code: 'STANDARD', deliveryType: 'HOME', description: null,
    minDeliveryDays: 2, maxDeliveryDays: 4, price: 5, freeShippingThreshold: null, active: true
  };

  beforeEach(() => {
    service = jasmine.createSpyObj('ShippingMethodService', ['list', 'create', 'update']);
    service.list.and.returnValue(of([method]));
    service.create.and.returnValue(of(method));
    service.update.and.returnValue(of({ ...method, active: false }));
    TestBed.configureTestingModule({
      imports: [ShippingMethodManagementComponent],
      providers: [provideRouter([]), { provide: ShippingMethodService, useValue: service }]
    });
  });

  it('crée une méthode et actualise la liste', () => {
    const fixture = TestBed.createComponent(ShippingMethodManagementComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openEditor();
    component.form.patchValue({ name: ' Standard ', code: 'standard', minDeliveryDays: 2, maxDeliveryDays: 4, price: 5 });
    component.save();
    expect(service.create).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Standard', code: 'STANDARD', active: true }));
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(component.editorOpen).toBeFalse();
  });

  it('refuse un délai inversé et permet la désactivation', () => {
    const component = TestBed.createComponent(ShippingMethodManagementComponent).componentInstance;
    component.openEditor(method);
    component.form.patchValue({ minDeliveryDays: 6, maxDeliveryDays: 2 });
    component.save();
    expect(service.update).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('Maximum delivery time');
    component.form.patchValue({ maxDeliveryDays: 6, active: false });
    component.save();
    expect(service.update).toHaveBeenCalledWith(1, jasmine.objectContaining({ active: false }));
  });
});
