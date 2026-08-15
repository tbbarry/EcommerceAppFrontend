import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Address, AuthService, ChangePasswordPayload, UpdateProfilePayload, UpsertAddressPayload, User } from '../../../core/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  readonly user$;
  readonly profileForm;
  readonly addressForm;
  readonly passwordForm;
  isSaving = false;
  saveError = '';
  saveSuccess = '';
  addresses: Address[] = [];
  addressesError = '';
  isAddressesLoading = false;
  isAddressEditorOpen = false;
  isAddressSaving = false;
  addressFormError = '';
  addressFormSuccess = '';
  editingAddressId: string | null = null;
  isPasswordSaving = false;
  passwordError = '';
  passwordSuccess = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.user$ = this.authService.user$;
    this.profileForm = this.formBuilder.nonNullable.group({
      firstname: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9+()\s-]{6,20}$/)]]
    });

    this.addressForm = this.formBuilder.nonNullable.group({
      label: [''],
      line1: ['', [Validators.required, Validators.maxLength(120)]],
      line2: [''],
      city: ['', [Validators.required, Validators.pattern(/^[A-Za-z .'-]{2,100}$/)]],
      state: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
      postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}(?:-\d{4})?$/)]],
      country: [''],
      phone: ['', [Validators.required, Validators.pattern(/^(\+1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}$/)]],
      isDefault: [false]
    });

    this.passwordForm = this.formBuilder.nonNullable.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });

    this.user$.pipe(takeUntilDestroyed()).subscribe((user) => {
      if (!user) {
        return;
      }

      this.profileForm.patchValue({
        firstname: user.firstname ?? '',
        lastname: user.lastname ?? '',
        email: user.email ?? '',
        phone: user.phone ?? ''
      }, { emitEvent: false });

      if (this.addresses.length === 0 && user.addresses && user.addresses.length > 0) {
        this.addresses = user.addresses;
      }
    });
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  getDisplayName(user: User): string {
    const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();
    return fullName || user.email || 'Client';
  }

  getAddresses(user: User): Address[] {
    return this.addresses.length > 0 ? this.addresses : (user.addresses ?? []);
  }

  getAddressTitle(address: Address, index: number): string {
    return address.label || (address.isDefault ? 'Default Address' : `Address ${index + 1}`);
  }

  getAddressText(address: Address): string {
    return [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
      .filter((part) => !!part)
      .join(', ');
  }

  logout(): void {
    this.authService.logout();
  }

  isFieldInvalid(fieldName: 'firstname' | 'lastname' | 'phone'): boolean {
    const field = this.profileForm.controls[fieldName];
    return field.invalid && (field.touched || field.dirty);
  }

  isPasswordFieldInvalid(fieldName: 'oldPassword' | 'newPassword' | 'confirmPassword'): boolean {
    const field = this.passwordForm.controls[fieldName];
    return field.invalid && (field.touched || field.dirty);
  }

  get shouldShowPasswordRules(): boolean {
    return this.passwordForm.controls.newPassword.dirty;
  }

  get hasMinLengthRule(): boolean {
    return this.passwordForm.controls.newPassword.value.length >= 8;
  }

  get hasUppercaseRule(): boolean {
    return /[A-Z]/.test(this.passwordForm.controls.newPassword.value);
  }

  get hasDigitRule(): boolean {
    return /[0-9]/.test(this.passwordForm.controls.newPassword.value);
  }

  get hasSpecialCharRule(): boolean {
    return /[@#$%^&+=]/.test(this.passwordForm.controls.newPassword.value);
  }

  get isPasswordConfirmationMismatch(): boolean {
    const confirm = this.passwordForm.controls.confirmPassword;
    return confirm.dirty && this.passwordForm.controls.newPassword.value !== confirm.value;
  }

  showMyOrder() {
  throw new Error('Method not implemented.');
 }

  saveChanges(): void {
    this.saveError = '';
    this.saveSuccess = '';

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const payload: UpdateProfilePayload = {
      firstname: this.profileForm.controls.firstname.value.trim(),
      lastname: this.profileForm.controls.lastname.value.trim(),
      phone: this.profileForm.controls.phone.value.trim() || undefined
    };

    this.isSaving = true;
    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = 'Profil mis a jour avec succes.';
      },
      error: (error) => {
        this.isSaving = false;
        this.saveError = error?.error?.message || error?.message || 'Impossible de mettre a jour le profil.';
      }
    });
  }

  savePasswordChanges(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordForm.invalid || this.isPasswordConfirmationMismatch) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (!(this.hasMinLengthRule && this.hasUppercaseRule && this.hasDigitRule && this.hasSpecialCharRule)) {
      this.passwordForm.controls.newPassword.markAsDirty();
      return;
    }

    const payload: ChangePasswordPayload = {
      oldPassword: this.passwordForm.controls.oldPassword.value,
      newPassword: this.passwordForm.controls.newPassword.value
    };

    this.isPasswordSaving = true;
    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.isPasswordSaving = false;
        this.passwordSuccess = 'Mot de passe mis a jour avec succes.';
        this.passwordForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: (error) => {
        this.isPasswordSaving = false;
        this.passwordError = error?.message || error?.error?.message || 'Impossible de modifier le mot de passe.';
      }
    });
  }

  private loadAddresses(): void {
    this.addressesError = '';
    this.isAddressesLoading = true;

    this.authService.getMyAddresses().subscribe({
      next: (addresses) => {
        this.isAddressesLoading = false;
        this.addresses = addresses;
      },
      error: () => {
        this.isAddressesLoading = false;
        this.addressesError = 'Impossible de charger les adresses pour le moment.';
      }
    });
  }

  openAddAddressForm(): void {
    this.isAddressEditorOpen = true;
    this.editingAddressId = null;
    this.addressFormError = '';
    this.addressFormSuccess = '';
    this.addressForm.reset({
      label: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phone: '',
      isDefault: this.addresses.length === 0
    });
  }

  openEditAddressForm(address: Address): void {
    this.isAddressEditorOpen = true;
    this.editingAddressId = address.id ?? null;
    this.addressFormError = '';
    this.addressFormSuccess = '';
    this.addressForm.reset({
      label: address.label ?? '',
      line1: address.line1 ?? '',
      line2: address.line2 ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      postalCode: address.postalCode ?? '',
      country: address.country ?? '',
      phone: address.phone ?? '',
      isDefault: !!address.isDefault
    });
  }

  cancelAddressForm(): void {
    this.isAddressEditorOpen = false;
    this.editingAddressId = null;
    this.addressFormError = '';
    this.addressFormSuccess = '';
  }

  isAddressFieldInvalid(
    fieldName: 'label' | 'line1' | 'city' | 'state' | 'postalCode' | 'country' | 'phone'
  ): boolean {
    const field = this.addressForm.controls[fieldName];
    return field.invalid && (field.touched || field.dirty);
  }

  saveAddress(): void {
    this.addressFormError = '';
    this.addressFormSuccess = '';

    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    const payload = this.buildAddressPayloadFromForm();
    const isEditing = !!this.editingAddressId;
    this.isAddressSaving = true;

    const request$ = this.editingAddressId
      ? this.authService.updateAddress(this.editingAddressId, payload)
      : this.authService.addAddress(payload);

    request$.subscribe({
      next: (addresses) => {
        this.isAddressSaving = false;
        this.addresses = addresses;
        this.isAddressEditorOpen = false;
        this.editingAddressId = null;
        this.addressFormSuccess = isEditing ? 'Adresse modifiee avec succes.' : 'Adresse ajoutee avec succes.';
      },
      error: (error) => {
        this.isAddressSaving = false;
        this.addressFormError =
          error?.error?.message || error?.message || 'Impossible d enregistrer cette adresse pour le moment.';
      }
    });
  }

  removeAddress(address: Address): void {
    if (!address.id) {
      this.addressFormError = 'Cette adresse ne peut pas etre supprimee car son identifiant est manquant.';
      return;
    }

    const shouldDelete = globalThis.confirm('Supprimer cette adresse ?');
    if (!shouldDelete) {
      return;
    }

    this.addressFormError = '';
    this.addressFormSuccess = '';
    this.authService.deleteAddress(address.id).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.addressFormSuccess = 'Adresse supprimee avec succes.';
      },
      error: (error) => {
        this.addressFormError =
          error?.error?.message || error?.message || 'Impossible de supprimer cette adresse pour le moment.';
      }
    });
  }

  setAsMainAddress(address: Address): void {
    if (!address.id || address.isDefault) {
      return;
    }

    this.addressFormError = '';
    this.addressFormSuccess = '';
    this.authService.setDefaultAddress(address).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.addressFormSuccess = 'Adresse principale mise a jour.';
      },
      error: (error) => {
        this.addressFormError =
          error?.error?.message || error?.message || 'Impossible de definir cette adresse comme principale.';
      }
    });
  }

  trackByAddress(index: number, address: Address): string {
    return address.id || `${address.label || 'address'}-${index}`;
  }

  private buildAddressPayloadFromForm(): UpsertAddressPayload {
    return {
      label: this.addressForm.controls.label.value.trim(),
      line1: this.addressForm.controls.line1.value.trim(),
      line2: this.addressForm.controls.line2.value.trim() || undefined,
      city: this.addressForm.controls.city.value.trim(),
      state: this.addressForm.controls.state.value.trim().toUpperCase() || undefined,
      postalCode: this.addressForm.controls.postalCode.value.trim() || undefined,
      country: this.addressForm.controls.country.value.trim(),
      phone: this.addressForm.controls.phone.value.trim() || undefined,
      isDefault: this.addressForm.controls.isDefault.value,
      defaultAddress: this.addressForm.controls.isDefault.value
    };
  }
}
