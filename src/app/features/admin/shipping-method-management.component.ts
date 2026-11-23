import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ShippingDeliveryType, ShippingMethod, ShippingMethodInput, ShippingMethodService } from '../../core/shipping-method.service';

@Component({
  selector: 'app-shipping-method-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './shipping-method-management.component.html',
  styleUrls: ['./shipping-method-management.component.css']
})
export class ShippingMethodManagementComponent implements OnInit {
  private readonly service = inject(ShippingMethodService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  methods: ShippingMethod[] = [];
  loading = false;
  loadFailed = false;
  busy = false;
  editorOpen = false;
  editingId: number | null = null;
  errorMessage = '';
  successMessage = '';

  readonly deliveryTypes: { value: ShippingDeliveryType; label: string }[] = [
    { value: 'HOME', label: 'Home delivery' },
    { value: 'HAND_TO_HAND', label: 'Hand delivery' },
    { value: 'PICKUP_POINT', label: 'Pickup point' },
    { value: 'LOCKER', label: 'Locker' }
  ];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]),
    code: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/), Validators.maxLength(60)]),
    deliveryType: this.fb.nonNullable.control<ShippingDeliveryType>('HOME', Validators.required),
    description: this.fb.nonNullable.control(''),
    minDeliveryDays: this.fb.control<number | null>(0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]),
    maxDeliveryDays: this.fb.control<number | null>(0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]),
    price: this.fb.control<number | null>(0, [Validators.required, Validators.min(0), Validators.max(99999999.99), Validators.pattern(/^\d+(?:\.\d{1,2})?$/)]),
    freeShippingThreshold: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(99999999.99), Validators.pattern(/^\d+(?:\.\d{1,2})?$/)]),
    active: this.fb.nonNullable.control(true)
  });

  ngOnInit(): void { this.load(); }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.busy || (this.editorOpen && this.form.dirty)) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canLeave(): boolean {
    if (this.busy) {
      this.errorMessage = 'Veuillez attendre la fin de l’enregistrement.';
      return false;
    }
    return !this.editorOpen || !this.form.dirty || confirm('Leave without saving this shipping method?');
  }

  load(): void {
    this.loading = true;
    this.loadFailed = false;
    this.errorMessage = '';
    this.service.list().pipe(finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: methods => this.methods = methods,
      error: error => {
        this.loadFailed = true;
        this.errorMessage = this.describeError(error, 'Could not load shipping methods.');
      }
    });
  }

  openEditor(method?: ShippingMethod): void {
    if (this.busy || (this.editorOpen && this.form.dirty && !confirm('Abandonner les modifications en cours ?'))) return;
    this.editingId = method?.id ?? null;
    this.form.reset({
      name: method?.name ?? '', code: method?.code ?? '', deliveryType: method?.deliveryType ?? 'HOME',
      description: method?.description ?? '', minDeliveryDays: method?.minDeliveryDays ?? 0,
      maxDeliveryDays: method?.maxDeliveryDays ?? 0, price: method?.price ?? 0,
      freeShippingThreshold: method?.freeShippingThreshold ?? null, active: method?.active ?? true
    });
    this.editorOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancel(): void {
    if (this.busy || (this.form.dirty && !confirm('Abandonner les modifications en cours ?'))) return;
    this.editorOpen = false;
  }

  save(): void {
    if (this.busy) return;
    const values = this.form.getRawValue();
    if (this.form.invalid || values.minDeliveryDays === null || values.maxDeliveryDays === null || values.price === null) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Check the required fields, delivery times, and amounts.';
      return;
    }
    if (values.maxDeliveryDays < values.minDeliveryDays) {
      this.errorMessage = 'Maximum delivery time must be at least the minimum.';
      return;
    }
    const payload: ShippingMethodInput = {
      ...values, name: values.name.trim(), code: values.code.trim().toUpperCase(),
      description: values.description.trim() || null,
      minDeliveryDays: values.minDeliveryDays, maxDeliveryDays: values.maxDeliveryDays, price: values.price
    };
    const request = this.editingId === null ? this.service.create(payload) : this.service.update(this.editingId, payload);
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    request.pipe(finalize(() => this.busy = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.editorOpen = false; this.load(); this.successMessage = 'Shipping method saved.'; },
      error: error => this.errorMessage = this.describeError(error, 'Could not save the shipping method.')
    });
  }

  typeLabel(type: ShippingDeliveryType): string {
    return this.deliveryTypes.find(item => item.value === type)?.label ?? type;
  }

  private describeError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return `${fallback} The server is unavailable.`;
    if (error.status === 401) return `${fallback} Please sign in again.`;
    if (error.status === 403) return `${fallback} Administrator access denied.`;
    if (error.error && typeof error.error.message === 'string') return `${fallback} ${error.error.message}`;
    return `${fallback} (HTTP ${error.status})`;
  }
}
