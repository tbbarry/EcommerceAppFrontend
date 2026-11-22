import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { ReviewService, ReviewSummary } from '../../core/review.service';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-reviews.component.html',
  styleUrl: './product-reviews.component.css'
})
export class ProductReviewsComponent implements OnChanges {
  @Input({ required: true }) productId!: number;
  @Output() summaryChange = new EventEmitter<ReviewSummary>(true);
  private readonly service = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly ratings = [5, 4, 3, 2, 1];
  summary: ReviewSummary | null = null;
  loading = false;
  error = '';
  page = 0;

  ngOnChanges(): void {
    this.summary = null;
    this.load(0);
  }

  load(page: number): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.request = this.service.publicReviews(this.productId, page)
      .pipe(finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: summary => { this.summary = summary; this.page = page; this.summaryChange.emit(summary); },
      error: () => this.error = 'Could not load reviews.'
    });
  }
}
