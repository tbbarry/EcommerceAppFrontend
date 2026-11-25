import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { AdminPromo, AdminPromoInput, AdminPromoService } from '../../core/admin-promo.service';

@Component({
  selector: 'app-promotion-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './promotion-management.component.html',
  styleUrls: ['./promotion-management.component.css']
})
export class PromotionManagementComponent implements OnInit {
  private readonly promosService = inject(AdminPromoService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  promos: AdminPromo[] = [];
  editingId: number | null = null;
  editorOpen = false;
  loading = false;
  loadFailed = false;
  busy = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    discountValue: [10, [Validators.required, Validators.min(0.01), Validators.max(100), Validators.pattern(/^\d+(?:\.\d{1,2})?$/)]],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadPromos();
  }

  get activeCount(): number {
    return this.promos.filter(promo => this.status(promo) === 'En cours').length;
  }

  get upcomingCount(): number {
    return this.promos.filter(promo => this.status(promo) === 'À venir').length;
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.busy || (this.editorOpen && this.form.dirty)) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canLeave(): boolean {
    if (this.busy) {
      this.errorMessage = 'Veuillez attendre la fin de l’opération avant de quitter cette page.';
      return false;
    }
    return !this.editorOpen || !this.form.dirty || confirm('Quitter sans enregistrer la promotion ?');
  }

  loadPromos(): void {
    this.loading = true;
    this.loadFailed = false;
    this.promosService.list().pipe(finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: promos => this.promos = promos,
      error: error => {
        this.loadFailed = true;
        this.errorMessage = this.describeError(error, 'Impossible de charger les promotions.');
      }
    });
  }

  openEditor(promo?: AdminPromo): void {
    if (this.busy || (this.editorOpen && this.form.dirty && !confirm('Abandonner les modifications en cours ?'))) return;
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.editingId = promo?.id ?? null;
    this.form.reset({
      code: promo?.code ?? '',
      discountValue: promo?.discountValue ?? 10,
      startDate: promo ? promo.startDate.substring(0, 19) : this.localDateTime(now),
      endDate: promo ? promo.endDate.substring(0, 19) : this.localDateTime(end),
      isActive: promo?.isActive ?? true
    });
    this.editorOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEditor(): void {
    if (this.busy || (this.form.dirty && !confirm('Abandonner les modifications en cours ?'))) return;
    this.editorOpen = false;
  }

  save(): void {
    if (this.busy) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    if (new Date(values.endDate).getTime() <= new Date(values.startDate).getTime()) {
      this.errorMessage = 'La date de fin doit être postérieure à la date de début.';
      return;
    }
    const payload: AdminPromoInput = { ...values, code: values.code.trim() };
    const request = this.editingId === null
      ? this.promosService.create(payload)
      : this.promosService.update(this.editingId, payload);
    this.mutate(request, 'Promotion enregistrée.', () => {
      this.editorOpen = false;
      this.loadPromos();
    });
  }

  delete(promo: AdminPromo): void {
    if (this.busy || !confirm(`Supprimer « ${promo.code} » et toutes ses attributions ? Les prix seront recalculés.`)) return;
    this.mutate(this.promosService.delete(promo.id), 'Promotion supprimée.', () => {
      this.loadPromos();
    });
  }

  toggleActivation(promo: AdminPromo): void {
    if (this.busy) return;
    const action = promo.isActive ? 'deactivatePromo' : 'activatePromo';
    const message = promo.isActive ? 'Promotion désactivée.' : 'Promotion activée.';
    this.mutate(this.promosService[action](promo.id), message, () => {
      this.loadPromos();
    });
  }

  status(promo: AdminPromo): string {
    if (!promo.isActive) return 'Désactivée';
    const now = Date.now();
    if (new Date(promo.startDate).getTime() > now) return 'À venir';
    if (new Date(promo.endDate).getTime() < now) return 'Terminée';
    return 'En cours';
  }

  private localDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private mutate(request: Observable<unknown>, message: string, onSuccess: () => void): void {
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    request.pipe(finalize(() => this.busy = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.successMessage = message; onSuccess(); },
      error: error => this.errorMessage = this.describeError(error, 'L’opération a échoué.')
    });
  }

  private describeError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return `${fallback} Le serveur est inaccessible.`;
    if (error.status === 401) return `${fallback} Veuillez vous reconnecter.`;
    if (error.status === 403) return `${fallback} Accès administrateur refusé.`;
    if (error.error && typeof error.error.message === 'string') return `${fallback} ${error.error.message}`;
    return `${fallback} (HTTP ${error.status})`;
  }
}
