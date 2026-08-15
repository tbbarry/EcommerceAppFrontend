import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/order.service';
import { Order } from '../../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {

  private readonly orderService = inject(OrderService);

  orders: Order[] = [];

  loading = false;
  error: string | null = null;

  selectedStatus = 'ALL';

  readonly statusTabs = [
    { value: 'ALL', label: 'Toutes', icon: 'bi bi-receipt' },
    { value: 'PENDING', label: 'En attente', icon: 'bi bi-hourglass-split' },
    { value: 'PAID', label: 'Payées', icon: 'bi bi-credit-card' },
    { value: 'SHIPPED', label: 'Expédiées', icon: 'bi bi-box-seam' },
    { value: 'DELIVERED', label: 'Livrées', icon: 'bi bi-check2-circle' },
    { value: 'CANCELLED', label: 'Annulées', icon: 'bi bi-x-circle' }
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    this.orderService.getMyOrders().subscribe({
      next: (orders: Order[]) => {
        this.orders = orders ?? [];
        this.loading = false;
      },

      error: (error) => {
        console.error('Error fetching orders:', error);

        this.error = 'Impossible de récupérer vos commandes.';
        this.loading = false;
      }
    });
  }

  get filteredOrders(): Order[] {
    if (this.selectedStatus === 'ALL') {
      return this.orders;
    }

    return this.orders.filter(
      order => order.status === this.selectedStatus
    );
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
  }

  getStatusCount(status: string): number {
    if (status === 'ALL') {
      return this.orders.length;
    }

    return this.orders.filter(
      order => order.status === status
    ).length;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';

      case 'PAID':
        return 'Payée';

      case 'SHIPPED':
        return 'Expédiée';

      case 'DELIVERED':
        return 'Livrée';

      case 'CANCELLED':
        return 'Annulée';

      case 'PROCESSING':
        return 'En préparation';

      default:
        return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bi bi-hourglass-split';

      case 'PAID':
        return 'bi bi-credit-card';

      case 'PROCESSING':
        return 'bi bi-box-seam';

      case 'SHIPPED':
        return 'bi bi-truck';

      case 'DELIVERED':
        return 'bi bi-check2-circle';

      case 'CANCELLED':
        return 'bi bi-x-circle';

      default:
        return 'bi bi-receipt';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';

      case 'PAID':
        return 'status-paid';

      case 'PROCESSING':
        return 'status-processing';

      case 'SHIPPED':
        return 'status-shipped';

      case 'DELIVERED':
        return 'status-delivered';

      case 'CANCELLED':
        return 'status-cancelled';

      default:
        return 'status-default';
    }
  }

  getDeliveryTypeLabel(type: string | null | undefined): string {
    switch (type) {
      case 'PICKUP_POINT':
        return 'Point relais';

      case 'LOCKER':
        return 'Consigne';

      case 'HAND_TO_HAND':
        return 'Livraison à domicile';

      default:
        return type || 'Livraison';
    }
  }

  getItemsCount(order: Order): number {
    return order.items?.reduce(
      (total, item) => total + (item.quantity ?? 0),
      0
    ) ?? 0;
  }

  getOrderSubtotal(order: Order): number {
    return Number(order.subtotal ?? 0);
  }

  getShippingCost(order: Order): number {
    return Number(
      order.shippingCost ??
      order.shippingOrder ??
      0
    );
  }

  getDiscount(order: Order): number {
    return Number(order.discountAmount ?? 0);
  }

  getTotal(order: Order): number {
    return Number(order.total ?? 0);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  trackByItemId(index: number, item: any): number {
    return item.id;
  }
}