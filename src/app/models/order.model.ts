export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type DeliveryType =
  | 'PICKUP_POINT'
  | 'LOCKER'
  | 'HAND_TO_HAND';

export interface OrderItem {
  id: number;
  orderId: number | null;
  variantId: number | null;
  quantity: number;

  totalPrice: number;
  unitPrice: number;

  productNameSnapshot: string;
  variantSkuSnapshot: string;

  colorSnapshot: string | null;
  productDescriptionSnapshot: string | null;
  sizeSnapshot: string | null;

  imageUrlSnapshot: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface Order {
  id: number;
  userId: number | null;
  deliveryAddressId: number | null;

  orderNumber: string;
  dateOrder: string;

  taxAmount: number;
  subtotal: number;

  shippingOrder: number;
  shippingCost: number;
  shippingMethodName: string | null;

  deliveryType: DeliveryType;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;

  shippingFirstName: string | null;
  shippingLastName: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;

  couponCodeUsed: string | null;
  discountAmount: number;

  total: number;

  status: OrderStatus;

  createdAt: string;
  updatedAt: string;

  taxRate: number;

  items: OrderItem[];
}