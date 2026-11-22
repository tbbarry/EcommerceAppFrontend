import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Review, ReviewService } from '../../core/review.service';

@Component({
  selector: 'app-review-management',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './review-management.component.html',
  styleUrl: './review-management.component.css'
})
export class ReviewManagementComponent implements OnInit {
  private readonly service = inject(ReviewService);
  reviews: Review[] = [];
  page = 0;
  totalPages = 0;
  total = 0;
  loading = false;
  savingId: number | null = null;
  error = '';

  ngOnInit(): void { this.load(0); }

  load(page: number): void {
    this.loading = true;
    this.error = '';
    this.service.admin(page).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => {
        this.reviews = result.content;
        this.page = result.number;
        this.totalPages = result.totalPages;
        this.total = result.totalElements;
      },
      error: () => this.error = 'Impossible de charger les avis. Réessayez.'
    });
  }

  toggle(review: Review): void {
    if (this.savingId !== null) return;
    this.savingId = review.id;
    this.error = '';
    this.service.setVisibility(review.id, !review.visible)
      .pipe(finalize(() => this.savingId = null)).subscribe({
        next: updated => this.reviews = this.reviews.map(item => item.id === updated.id ? updated : item),
        error: () => this.error = "Impossible de modifier la visibilité de l’avis."
      });
  }
}
