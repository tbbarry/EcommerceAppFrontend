import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize, forkJoin } from 'rxjs';
import { AdminTaxonomyService } from '../../core/admin-taxonomy.service';
import { Category, MenuService } from '../../core/menu.service';
import { AdminAttribute } from '../../models/admin-product.model';

interface CategoryRow {
  category: Category;
  parentId: number | null;
  depth: number;
}

@Component({
  selector: 'app-taxonomy-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './taxonomy-management.component.html',
  styleUrls: ['./taxonomy-management.component.css']
})
export class TaxonomyManagementComponent implements OnInit {
  private readonly service = inject(AdminTaxonomyService);
  private readonly menu = inject(MenuService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  categories: Category[] = [];
  rows: CategoryRow[] = [];
  attributes: AdminAttribute[] = [];
  tab: 'categories' | 'attributes' = 'categories';
  editor: 'category' | 'attribute' | 'value' | null = null;
  editingId: number | null = null;
  valueAttribute: AdminAttribute | null = null;
  loading = false;
  loaded = false;
  busy = false;
  errorMessage = '';
  successMessage = '';

  readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.pattern(/\S/)]],
    categoryId: new FormControl<number | null>(null),
    displayOrder: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]]
  });
  readonly nameForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]]
  });

  ngOnInit(): void {
    this.load();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.busy || this.isDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canLeave(): boolean {
    if (this.busy) {
      this.errorMessage = 'Veuillez attendre la fin de l’opération avant de quitter.';
      return false;
    }
    return !this.isDirty() || confirm('Quitter sans enregistrer vos modifications ?');
  }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    forkJoin({ categories: this.service.categories(), attributes: this.service.attributes() }).pipe(
      finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: result => {
        this.categories = result.categories;
        this.rows = this.flatten(result.categories);
        this.attributes = result.attributes;
        this.loaded = true;
      },
      error: error => {
        this.loaded = false;
        this.errorMessage = this.describeError(error, 'Impossible de charger les catégories et les attributs.');
      }
    });
  }

  switchTab(tab: 'categories' | 'attributes'): void {
    if (this.tab === tab || !this.closeEditor()) return;
    this.tab = tab;
  }

  openCategory(row?: CategoryRow, parentId: number | null = null): void {
    if (!this.closeEditor()) return;
    this.editingId = row?.category.id ?? null;
    this.categoryForm.reset({
      name: row?.category.name ?? '',
      description: row?.category.description ?? '',
      categoryId: row ? row.parentId : parentId,
      displayOrder: row?.category.displayOrder ?? this.nextOrder()
    });
    this.editor = 'category';
    this.focusEditor('category-name');
  }

  openAttribute(attribute?: AdminAttribute): void {
    if (!this.closeEditor()) return;
    this.editingId = attribute?.id ?? null;
    this.nameForm.reset({ name: attribute?.name ?? '' });
    this.editor = 'attribute';
    this.focusEditor('attribute-name');
  }

  openValue(attribute: AdminAttribute, value?: { id: number; value: string }): void {
    if (!this.closeEditor()) return;
    this.valueAttribute = attribute;
    this.editingId = value?.id ?? null;
    this.nameForm.reset({ name: value?.value ?? '' });
    this.editor = 'value';
    this.focusEditor('attribute-name');
  }

  closeEditor(): boolean {
    if (this.busy || (this.isDirty() && !confirm('Abandonner les modifications en cours ?'))) return false;
    this.editor = null;
    this.valueAttribute = null;
    this.categoryForm.markAsPristine();
    this.nameForm.markAsPristine();
    return true;
  }

  get availableParents(): CategoryRow[] {
    if (this.editingId === null) return this.rows;
    const excluded = new Set<number>([this.editingId]);
    for (const row of this.rows) {
      if (row.parentId !== null && excluded.has(row.parentId)) excluded.add(row.category.id);
    }
    return this.rows.filter(row => !excluded.has(row.category.id));
  }

  saveCategory(): void {
    if (this.busy || this.loading) return;
    if (this.categoryForm.invalid) { this.categoryForm.markAllAsTouched(); return; }
    const value = this.categoryForm.getRawValue();
    const input = { ...value, name: value.name.trim(), description: value.description.trim() };
    const request = this.editingId === null
      ? this.service.createCategory(input)
      : this.service.updateCategory(this.editingId, input);
    this.mutate(request, 'Catégorie enregistrée.', true);
  }

  saveName(): void {
    if (this.busy || this.loading) return;
    if (this.nameForm.invalid) { this.nameForm.markAllAsTouched(); return; }
    const name = this.nameForm.controls.name.value.trim();
    let request: Observable<unknown>;
    if (this.editor === 'attribute') {
      request = this.editingId === null ? this.service.createAttribute(name) : this.service.updateAttribute(this.editingId, name);
    } else if (this.editor === 'value' && this.valueAttribute) {
      request = this.editingId === null
        ? this.service.createValue(this.valueAttribute.id, name)
        : this.service.updateValue(this.editingId, this.valueAttribute.id, name);
    } else {
      return;
    }
    this.mutate(request, this.editor === 'attribute' ? 'Attribut enregistré.' : 'Valeur enregistrée.');
  }

  deleteCategory(row: CategoryRow): void {
    if (this.busy || this.loading || !confirm(`Supprimer « ${row.category.name} » ? Une catégorie utilisée ou contenant des sous-catégories ne peut pas être supprimée.`)) return;
    this.mutate(this.service.deleteCategory(row.category.id), 'Catégorie supprimée.', true);
  }

  deleteAttribute(attribute: AdminAttribute): void {
    if (this.busy || this.loading || !confirm(`Supprimer « ${attribute.name} » et ses valeurs ? Les valeurs utilisées par des produits ne peuvent pas être supprimées.`)) return;
    this.mutate(this.service.deleteAttribute(attribute.id), 'Attribut supprimé.');
  }

  deleteValue(attribute: AdminAttribute, value: { id: number; value: string }): void {
    if (this.busy || this.loading || !confirm(`Supprimer « ${value.value} » de ${attribute.name} ? Une valeur utilisée par un produit ne peut pas être supprimée.`)) return;
    this.mutate(this.service.deleteValue(value.id), 'Valeur supprimée.');
  }

  private isDirty(): boolean {
    return this.editor === 'category' ? this.categoryForm.dirty : this.editor !== null && this.nameForm.dirty;
  }

  private focusEditor(id: string): void {
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const input = document.getElementById(id);
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus({ preventScroll: true });
    });
  }

  private flatten(categories: Category[], parentId: number | null = null, depth = 0): CategoryRow[] {
    return categories.flatMap(category => [
      { category, parentId, depth },
      ...this.flatten(category.children, category.id, depth + 1)
    ]);
  }

  private nextOrder(): number {
    return Math.max(0, ...this.categories.map(category => category.displayOrder ?? 0)) + 1;
  }

  private mutate(request: Observable<unknown>, message: string, categoryChanged = false): void {
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    request.pipe(finalize(() => this.busy = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.errorMessage = '';
        this.successMessage = message;
        this.editor = null;
        this.categoryForm.markAsPristine();
        this.nameForm.markAsPristine();
        if (categoryChanged) this.menu.refresh();
        this.load();
      },
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
