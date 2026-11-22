import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { AdminOrderDetail, AdminOrderService, AdminOrderSummary } from '../../core/admin-order.service';
import { OrderStatus } from '../../models/order.model';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-management.component.html',
  styleUrl: './order-management.component.css'
})
export class OrderManagementComponent implements OnInit {
  private readonly service = inject(AdminOrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;
  private detailRequest?: Subscription;
  private detailPanel?: ElementRef<HTMLElement>;

  @ViewChild('detailPanel') set panel(element: ElementRef<HTMLElement> | undefined) {
    this.detailPanel = element;
    element?.nativeElement.focus();
  }

  readonly statuses: { value: OrderStatus; label: string }[] = [
    { value: 'PENDING', label: 'Awaiting payment' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Canceled' }
  ];
  orders: AdminOrderSummary[] = [];
  detail: AdminOrderDetail | null = null;
  search = '';
  status = '';
  page = 0;
  totalPages = 0;
  total = 0;
  loading = false;
  loadingDetail = false;
  saving = false;
  listError = '';
  linkError = '';
  detailError = '';
  success = '';
  selectedId: number | null = null;

  ngOnInit(): void {
    this.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const rawId = params.get('orderId');
      this.linkError = '';
      if (rawId === null) return;
      const id = Number(rawId);
      if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(id)) {
        this.close();
        this.linkError = 'The requested order number is invalid.';
        return;
      }
      this.open(id);
    });
  }

  load(page = 0): void {
    this.listRequest?.unsubscribe();
    this.loading = true;
    this.listError = '';
    this.listRequest = this.service.list(this.search.trim(), this.status, page)
      .pipe(finalize(() => this.loading = false), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!result.content.length && page > 0 && page >= result.totalPages) {
            this.load(Math.max(0, result.totalPages - 1));
            return;
          }
          this.orders = result.content;
          this.page = result.number;
          this.totalPages = result.totalPages;
          this.total = result.totalElements;
        },
        error: error => this.listError = this.errorText(error, 'Could not load orders.')
      });
  }

  open(id: number): void {
    if (this.saving) return;
    this.detailRequest?.unsubscribe();
    this.selectedId = id;
    this.detailPanel?.nativeElement.focus();
    this.detail = null;
    this.detailError = '';
    this.success = '';
    this.loadingDetail = true;
    this.detailRequest = this.service.detail(id)
      .pipe(finalize(() => this.loadingDetail = false), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: detail => this.detail = detail,
        error: error => this.detailError = this.errorText(error, 'Could not load this order.')
      });
  }

  close(): void {
    if (this.saving) return;
    this.detailRequest?.unsubscribe();
    this.selectedId = null;
    this.detail = null;
    this.detailError = '';
  }

  nextStatus(status: OrderStatus): OrderStatus | null {
    if (status === 'PAID') return 'PROCESSING';
    if (status === 'PROCESSING') return 'SHIPPED';
    if (status === 'SHIPPED') return 'DELIVERED';
    return null;
  }

  advance(): void {
    const order = this.detail?.order;
    if (!order || this.saving) return;
    const next = this.nextStatus(order.status);
    if (!next || !confirm(`Mark order ${order.orderNumber} as ${this.statusLabel(next)}?`)) return;
    this.saving = true;
    this.detailError = '';
    this.success = '';
    this.service.advance(order.id, order.status, next)
      .pipe(finalize(() => this.saving = false), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: detail => {
          this.detail = detail;
          this.success = 'Order status updated.';
          this.load(this.page);
        },
        error: error => this.detailError = this.errorText(error, 'Could not update the status.')
      });
  }

  statusLabel(status: OrderStatus): string {
    return this.statuses.find(item => item.value === status)?.label ?? status;
  }

  itemDiscount(order: AdminOrderDetail['order']): number {
    return Math.max(0, Math.round((order.subtotal + order.shippingCost + order.taxAmount - order.total) * 100) / 100);
  }

  private errorText(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return `${fallback} The server is unavailable.`;
    if (error.status === 401) return `${fallback} Please sign in again.`;
    if (error.status === 403) return `${fallback} Administrator access denied.`;
    if (typeof error.error?.message === 'string') return `${fallback} ${error.error.message}`;
    return `${fallback} (HTTP ${error.status})`;
  }
}
