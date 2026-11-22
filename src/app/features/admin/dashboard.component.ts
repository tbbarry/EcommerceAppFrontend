import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminOrderSummary } from '../../core/admin-order.service';

interface Dashboard {
  readyToPrepare: number;
  processing: number;
  unavailableVariants: number;
  recentOrders: AdminOrderSummary[];
  unavailableItems: { productId: number; productName: string; sku: string }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  data: Dashboard | null = null;
  loading = false;
  error = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.http.get<Dashboard>(`${(environment.apiBaseUrl || '').replace(/\/$/, '')}/api/admin/dashboard`).subscribe({
      next: data => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Could not load the dashboard. Please try again.'; }
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Awaiting payment', PAID: 'Paid', PROCESSING: 'Processing',
      SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Canceled'
    };
    return labels[status] ?? status;
  }
}
