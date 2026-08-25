export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  brand: string | ""; // This should be string | null to be consistent with TypeScript conventions
  imageUrl: string | null;
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