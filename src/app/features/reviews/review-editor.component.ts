import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { Review, ReviewService } from '../../core/review.service';

@Component({
  selector: 'app-review-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-editor.component.html',
  styleUrl: './review-editor.component.css'
})
export class ReviewEditorComponent {
  @Input({ required: true }) itemId!: number;
  private readonly reviews = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest?: Subscription;
  readonly stars = [1, 2, 3, 4, 5];
  open = false;
  loading = false;
  saving = false;
  loadFailed = false;
  review: Review | null = null;
  rating = 0;
  comment = '';
  error = '';
  success = '';

  toggle(): void {
    this.open = !this.open;
    if (!this.open) {
      this.loadRequest?.unsubscribe();
      return;
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.success = '';
    this.loadRequest = this.reviews.mine(this.itemId)
      .pipe(finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: review => {
        this.review = review;
        this.rating = review?.rating ?? 0;
        this.comment = review?.comment ?? '';
      },
      error: () => {
        this.loadFailed = true;
        this.error = 'Could not load your review.';
      }
    });
  }

  save(): void {
    if (!this.rating || this.saving || this.loading) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    this.reviews.save(this.itemId, this.rating, this.comment)
      .pipe(finalize(() => this.saving = false), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: review => {
          this.review = review;
          this.success = review.visible ? 'Your review was saved.' : 'Your review was saved but remains hidden.';
        },
        error: () => this.error = 'Could not save your review. Please try again.'
      });
  }

  remove(): void {
    if (this.saving || !this.review || !confirm('Delete your review?')) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    this.reviews.delete(this.itemId).pipe(finalize(() => this.saving = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.review = null;
        this.rating = 0;
        this.comment = '';
        this.success = 'Your review was deleted.';
      },
      error: () => this.error = 'Could not delete your review. Please try again.'
    });
  }
}
