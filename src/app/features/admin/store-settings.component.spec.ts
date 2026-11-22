import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StoreSettingsService } from '../../core/store-settings.service';
import { StoreSettingsComponent } from './store-settings.component';

describe('Store settings page', () => {
  it('updates the displayed brand only after a successful save', () => {
    const settings = signal({ name: 'Old store', logoVersion: null, aboutText: '', contactText: '', contactEmail: '' });
    const store = {
      settings,
      error: signal(false),
      name: () => settings().name,
      logoUrl: () => null,
      updateName: jasmine.createSpy().and.returnValues(
        throwError(() => new Error('unavailable')),
        of({ name: 'New store', logoVersion: null, aboutText: '', contactText: '', contactEmail: '' })
      ),
      apply: (value: { name: string; logoVersion: null; aboutText: string; contactText: string; contactEmail: string }) => settings.set(value)
    };
    TestBed.configureTestingModule({
      imports: [StoreSettingsComponent],
      providers: [{ provide: StoreSettingsService, useValue: store }]
    });
    const fixture = TestBed.createComponent(StoreSettingsComponent);
    fixture.detectChanges();
    fixture.componentInstance.name = 'New store';
    fixture.componentInstance.saveName();
    expect(store.name()).toBe('Old store');
    expect(fixture.componentInstance.error).toContain('Could not save');
    fixture.componentInstance.saveName();
    expect(store.name()).toBe('New store');
    expect(fixture.componentInstance.success).toContain('saved');
  });

  it('saves editable page content without changing the store name', () => {
    const settings = signal({ name: 'Store', logoVersion: null, aboutText: '', contactText: '', contactEmail: '' });
    const store = {
      settings,
      error: signal(false),
      name: () => settings().name,
      logoUrl: () => null,
      updateContent: jasmine.createSpy().and.returnValue(of({
        ...settings(), aboutText: 'Our story', contactText: 'Get in touch', contactEmail: 'info@example.com'
      })),
      apply: (value: ReturnType<typeof settings>) => settings.set(value)
    };
    TestBed.configureTestingModule({
      imports: [StoreSettingsComponent],
      providers: [{ provide: StoreSettingsService, useValue: store }]
    });
    const fixture = TestBed.createComponent(StoreSettingsComponent);
    fixture.detectChanges();
    fixture.componentInstance.aboutText = 'Our story';
    fixture.componentInstance.contactText = 'Get in touch';
    fixture.componentInstance.contactEmail = 'info@example.com';
    fixture.componentInstance.saveContent();
    expect(store.updateContent).toHaveBeenCalledWith('Our story', 'Get in touch', 'info@example.com');
    expect(store.settings().name).toBe('Store');
    expect(fixture.componentInstance.success).toContain('saved');
  });
});
