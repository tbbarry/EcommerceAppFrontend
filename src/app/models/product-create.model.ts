/**
 * Modèles pour la création de produit
 * Utilisés par la page d'ajout de produit
 */

export interface ProductCreateRequest {
  name: string;
  description?: string;
  price: number;
  brand: string;
  stock?: number;
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  imageUrls?: string[];
}

export interface ProductVariant {
  sku: string;
  color?: string;
  size?: string;
  priceOverride?: number;
  stockOverride?: number;
}

export interface ProductResponse {
  id: string;
  name: string;
  description?: string;
  price: number;
  brand: string;
  stock?: number;
  colors?: string[];
  sizes?: string[];
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

// État du formulaire pour l'autosave (simplifié)
export interface ProductFormState {
  name?: string;
  description?: string;
  brand?: string;
  price?: number;
  stock?: number;
  colors?: { name: string; code: string }[];
  sizes?: string[];
  imageUrls?: string[];
}

// Options prédéfinies pour les variantes
export const PREDEFINED_COLORS = [
  { name: 'Noir', code: '#000000' },
  { name: 'Blanc', code: '#FFFFFF' },
  { name: 'Rouge', code: '#FF0000' },
  { name: 'Bleu', code: '#0000FF' },
  { name: 'Vert', code: '#008000' },
  { name: 'Jaune', code: '#FFFF00' },
  { name: 'Gris', code: '#808080' },
  { name: 'Orange', code: '#FFA500' },
  { name: 'Rose', code: '#FFC0CB' },
  { name: 'Violet', code: '#800080' }
];

export const PREDEFINED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const COMMON_BRANDS = [
  'Nike',
  'Adidas',
  'Puma',
  'Reebok',
  'New Balance',
  'Levi\'s',
  'H&M',
  'Zara',
  'Gucci',
  'Dior',
  'Chanel',
  'Louis Vuitton',
  'Other'
];
