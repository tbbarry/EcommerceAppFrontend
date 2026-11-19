export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  brand: string | "";
  imageUrl: string | null;
  basePriceMin?: number | null;
  basePriceMax?: number | null;
  finalPriceMin?: number | null;
  finalPriceMax?: number | null;
  displayPrice?: string | null;
  hasDiscount?: boolean;
  promoScope?: 'NONE' | 'GLOBAL' | 'VARIANT';
  discountPercentGlobal?: number | null;
  discountPercentMin?: number | null;
  discountPercentMax?: number | null;
}

export interface CategoryNode {
  id: number;
  name: string;
  children: CategoryNode[];
}

export interface FacetValue {
  id: number;
  label: string;
  selected: boolean;
}

export interface Facet {
  id: number;
  code: string;
  values: FacetValue[];
}

export interface CatalogResponse {
  products: ProductCard[];
  categories: CategoryNode[];
  facets: Facet[];
  totalProducts: number;
  page: number;
  size: number;
}