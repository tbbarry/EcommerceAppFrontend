import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-promotion-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promotion-badge.component.html',
  styleUrls: ['./promotion-badge.component.css']
})
export class PromotionBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() tone: 'danger' | 'info' = 'danger';
}
