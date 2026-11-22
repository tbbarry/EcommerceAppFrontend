export interface ProductAdminListResponse {
  id: number;
  name: string;
  brand: string;
  categoryName: string;
  price: number;
  totalVariants: number;
  totalStock: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAdminDetailResponse {
  id: number;
  name: string;
  description: string;
  brand: string;
  slug: string;
  price: number;
  categoryId: number;
  categoryName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  variants: VariantAdminResponse[];
  images: ProductImageDto[];
}

export interface VariantAdminResponse {
  id: number;
  sku: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  stock?: VariantStockResponse;
  attributeValues: VariantAttributeValueDto[];
}

export interface VariantStockResponse {
  id: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariantAttributeValueDto {
  id: number;
  attributeId: number;
  attributeName: string;
  attributeValueId: number;
  attributeValueName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageDto {
  id: number;
  url: string;
  alt: string;
  main: boolean;
  displayOrder: number;
  visualAttributeValueId?: number | null;
  visualAttributeValueName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCategory {
  id: number;
  name: string;
  children?: AdminCategory[];
}

export interface AdminAttribute {
  id: number;
  name: string;
  values: { id: number; value: string }[];
}

export interface AdminProductUpdate {
  name: string;
  description: string;
  brand: string;
  categoryId: number;
  price: number;
}

export interface AdminVariantUpdate {
  price: number;
  attributeValueIds: number[];
}

export interface AdminVariantCreate extends AdminVariantUpdate {
  quantity: number;
}

export type AdminImageCreate = {
  alt?: string;
  isMain: boolean;
  displayOrder: number;
  visualAttributeValueId?: number;
} & ({ file: File; url?: never } | { url: string; file?: never });

export interface AdminImageUpdate {
  alt?: string;
  isMain?: boolean;
  displayOrder?: number;
  visualAttributeValueId?: number | null;
}

export interface PageSortResponse {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface PageableResponse {
  pageNumber: number;
  pageSize: number;
  offset: number;
  paged: boolean;
  unpaged: boolean;
  sort: PageSortResponse;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage?: number;
  size: number;
  number: number;
  pageable: PageableResponse;
  first: boolean;
  last: boolean;
  empty: boolean;
  sort: PageSortResponse;
}
