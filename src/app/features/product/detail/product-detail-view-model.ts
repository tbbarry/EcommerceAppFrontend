import { resolveProductImageUrl } from '../../../shared/product-image-url';

export type PromoScope = 'NONE' | 'GLOBAL' | 'VARIANT';

export interface ApiProductDetail {
  id: number;
  slug: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  pricing?: ApiPricing | null;
  price?: number | null;
  basePriceMin?: number | null;
  basePriceMax?: number | null;
  finalPriceMin?: number | null;
  finalPriceMax?: number | null;
  displayPrice?: string | null;
  hasDiscount?: boolean;
  promoScope?: PromoScope;
  discountPercentGlobal?: number | null;
  discountPercentMin?: number | null;
  discountPercentMax?: number | null;
  stockSummary?: ApiStockSummary | null;
  categories?: ApiCategory[] | null;
  colors?: ApiColor[] | null;
  sizes?: ApiSize[] | null;
  defaultImages?: ApiImage[] | null;
  imagesByColor?: Record<string, ApiImage[] | null> | null;
  globalPromotions?: ApiPromotion[] | null;
  variantPromotions?: ApiPromotion[] | null;
  variants?: ApiVariant[] | null;
  selectionMatrix?: Record<string, Record<string, ApiSelectionCell | null> | null> | null;
}

export interface ApiPricing {
  basePriceMin?: number | null;
  basePriceMax?: number | null;
  finalPriceMin?: number | null;
  finalPriceMax?: number | null;
  displayPrice?: string | null;
  hasDiscount?: boolean;
  promoScope?: PromoScope;
  discountPercentGlobal?: number | null;
  discountPercentMin?: number | null;
  discountPercentMax?: number | null;
}

export interface ApiStockSummary {
  totalStock?: number | null;
  inStockVariants?: number | null;
  outOfStockVariants?: number | null;
  hasAnyStock?: boolean | null;
}

export interface ApiCategory {
  id: number;
  name: string;
  parentId?: number | null;
  parentName?: string | null;
}

export interface ApiColor {
  name: string;
  available?: boolean | null;
  totalStock?: number | null;
  imageCount?: number | null;
  sizesAvailable?: string[] | null;
}

export interface ApiSize {
  value: string;
  available?: boolean | null;
  totalStock?: number | null;
}

export interface ApiImage {
  id: number;
  url: string;
  alt?: string | null;
  isMain?: boolean | null;
  color?: string | null;
}

export interface ApiPromotion {
  variantId?: number | null;
  code?: string | null;
  percent?: number | null;
  scope?: PromoScope | null;
}

export interface ApiVariant {
  id: number;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  finalPrice?: number | null;
  appliedDiscountPercent?: number | null;
  appliedPromoScope?: PromoScope | null;
  stock?: number | null;
  inStock?: boolean | null;
  imageIds?: number[] | null;
}

export interface ApiSelectionCell {
  variantId: number;
  stock?: number | null;
  inStock?: boolean | null;
}

export interface ProductDetailViewModel {
  id: number;
  slug: string;
  name: string;
  brand: string;
  description: string;
  breadcrumbs: string[];
  pricing: ProductPricingViewModel;
  stockSummary: ProductStockSummaryViewModel;
  categories: ProductCategoryViewModel[];
  colors: ProductColorViewModel[];
  sizes: ProductSizeViewModel[];
  defaultImages: ProductImageViewModel[];
  imagesByColor: Record<string, ProductImageViewModel[]>;
  globalPromotions: ProductPromotionViewModel[];
  variantPromotions: ProductPromotionViewModel[];
  variants: ProductVariantViewModel[];
  selectionMatrix: Record<string, Record<string, ProductSelectionCellViewModel>>;
}

export interface ProductPricingViewModel {
  basePriceMin: number;
  basePriceMax: number;
  finalPriceMin: number;
  finalPriceMax: number;
  displayPrice: string;
  hasDiscount: boolean;
  promoScope: PromoScope;
  discountPercentGlobal: number | null;
  discountPercentMin: number | null;
  discountPercentMax: number | null;
}

export interface ProductStockSummaryViewModel {
  totalStock: number;
  inStockVariants: number;
  outOfStockVariants: number;
  hasAnyStock: boolean;
}

export interface ProductCategoryViewModel {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
}

export interface ProductColorViewModel {
  name: string;
  available: boolean;
  totalStock: number;
  imageCount: number;
  sizesAvailable: string[];
}

export interface ProductSizeViewModel {
  value: string;
  available: boolean;
  totalStock: number;
}

export interface ProductImageViewModel {
  id: number;
  url: string;
  alt: string;
  isMain: boolean;
  color: string | null;
}

export interface ProductPromotionViewModel {
  variantId: number | null;
  code: string | null;
  percent: number | null;
  scope: PromoScope;
}

export interface ProductVariantViewModel {
  id: number;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  finalPrice: number;
  appliedDiscountPercent: number;
  appliedPromoScope: PromoScope;
  stock: number;
  inStock: boolean;
  imageIds: number[];
}

export interface ProductSelectionCellViewModel {
  variantId: number;
  stock: number;
  inStock: boolean;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asPromoScope(value: unknown): PromoScope {
  return value === 'GLOBAL' || value === 'VARIANT' ? value : 'NONE';
}

function clampPercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function buildBreadcrumbs(categories: ProductCategoryViewModel[]): string[] {
  if (!categories.length) {
    return [];
  }

  const first = categories[0];
  const segments: string[] = [];

  if (first.parentName) {
    segments.push(first.parentName);
  }

  segments.push(first.name);

  return segments.filter((item, index, arr) => !!item && arr.indexOf(item) === index);
}

function normalizeImages(images: ApiImage[] | null | undefined): ProductImageViewModel[] {
  return (images || [])
    .filter((image) => !!image?.url)
    .map((image) => ({
      id: image.id,
      url: resolveProductImageUrl(image.url),
      alt: asString(image.alt, ''),
      isMain: !!image.isMain,
      color: image.color ?? null
    }))
    .sort((left, right) => Number(right.isMain) - Number(left.isMain) || left.id - right.id);
}

function normalizeColorKey(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueByImageId(images: ProductImageViewModel[]): ProductImageViewModel[] {
  const seen = new Set<number>();

  return images.filter((image) => {
    if (seen.has(image.id)) {
      return false;
    }

    seen.add(image.id);
    return true;
  });
}

function normalizePricing(product: ApiProductDetail): ProductPricingViewModel {
  const pricing = product.pricing || {};
  const fallbackPrice = asNumber(product.price, 0);

  const baseMin = asNumber(pricing.basePriceMin, asNumber(product.basePriceMin, fallbackPrice));
  const baseMax = Math.max(baseMin, asNumber(pricing.basePriceMax, asNumber(product.basePriceMax, baseMin)));
  const finalMin = asNumber(pricing.finalPriceMin, asNumber(product.finalPriceMin, baseMin));
  const finalMax = Math.max(finalMin, asNumber(pricing.finalPriceMax, asNumber(product.finalPriceMax, finalMin)));

  return {
    basePriceMin: baseMin,
    basePriceMax: baseMax,
    finalPriceMin: finalMin,
    finalPriceMax: finalMax,
    displayPrice: asString(pricing.displayPrice, asString(product.displayPrice, '')),
    hasDiscount: (pricing.hasDiscount ?? product.hasDiscount) === true,
    promoScope: asPromoScope(pricing.promoScope ?? product.promoScope),
    discountPercentGlobal: clampPercent(pricing.discountPercentGlobal ?? product.discountPercentGlobal),
    discountPercentMin: clampPercent(pricing.discountPercentMin ?? product.discountPercentMin),
    discountPercentMax: clampPercent(pricing.discountPercentMax ?? product.discountPercentMax)
  };
}

export function buildProductDetailViewModel(apiProduct: ApiProductDetail): ProductDetailViewModel {
  const categories: ProductCategoryViewModel[] = (apiProduct.categories || []).map((category) => ({
    id: category.id,
    name: category.name,
    parentId: category.parentId ?? null,
    parentName: category.parentName ?? null
  }));

  const colors: ProductColorViewModel[] = (apiProduct.colors || []).map((color) => ({
    name: color.name,
    available: color.available !== false,
    totalStock: asNumber(color.totalStock, 0),
    imageCount: asNumber(color.imageCount, 0),
    sizesAvailable: color.sizesAvailable || []
  }));

  const sizes: ProductSizeViewModel[] = (apiProduct.sizes || []).map((size) => ({
    value: size.value,
    available: size.available !== false,
    totalStock: asNumber(size.totalStock, 0)
  }));

  const defaultImages = normalizeImages(apiProduct.defaultImages);

  const imagesByColor: Record<string, ProductImageViewModel[]> = {};
  const groupedByNormalizedColor: Record<string, ProductImageViewModel[]> = {};

  Object.entries(apiProduct.imagesByColor || {}).forEach(([colorName, images]) => {
    const normalizedKey = normalizeColorKey(colorName);
    groupedByNormalizedColor[normalizedKey] = [
      ...(groupedByNormalizedColor[normalizedKey] || []),
      ...normalizeImages(images || [])
    ];
  });

  defaultImages.forEach((image) => {
    if (!image.color) {
      return;
    }

    const normalizedKey = normalizeColorKey(image.color);
    groupedByNormalizedColor[normalizedKey] = [
      ...(groupedByNormalizedColor[normalizedKey] || []),
      image
    ];
  });

  colors.forEach((color) => {
    const normalizedKey = normalizeColorKey(color.name);
    imagesByColor[color.name] = uniqueByImageId(groupedByNormalizedColor[normalizedKey] || []);
  });

  Object.entries(groupedByNormalizedColor).forEach(([normalizedKey, images]) => {
    const alreadyMapped = Object.keys(imagesByColor).some((key) => normalizeColorKey(key) === normalizedKey);
    if (!alreadyMapped) {
      imagesByColor[normalizedKey] = uniqueByImageId(images);
    }
  });

  const variants: ProductVariantViewModel[] = (apiProduct.variants || []).map((variant) => ({
    id: variant.id,
    sku: asString(variant.sku, ''),
    color: variant.color ?? null,
    size: variant.size ?? null,
    price: asNumber(variant.price, 0),
    finalPrice: asNumber(variant.finalPrice, asNumber(variant.price, 0)),
    appliedDiscountPercent: asNumber(variant.appliedDiscountPercent, 0),
    appliedPromoScope: asPromoScope(variant.appliedPromoScope),
    stock: Math.max(0, asNumber(variant.stock, 0)),
    inStock: (variant.inStock ?? asNumber(variant.stock, 0) > 0) === true,
    imageIds: variant.imageIds || []
  }));

  const matrix: Record<string, Record<string, ProductSelectionCellViewModel>> = {};
  Object.entries(apiProduct.selectionMatrix || {}).forEach(([colorName, sizeMap]) => {
    const normalizedSizeMap: Record<string, ProductSelectionCellViewModel> = {};
    Object.entries(sizeMap || {}).forEach(([sizeValue, cell]) => {
      if (!cell) {
        return;
      }

      normalizedSizeMap[sizeValue] = {
        variantId: cell.variantId,
        stock: Math.max(0, asNumber(cell.stock, 0)),
        inStock: (cell.inStock ?? asNumber(cell.stock, 0) > 0) === true
      };
    });

    matrix[colorName] = normalizedSizeMap;
  });

  const totalStock = Math.max(0, asNumber(apiProduct.stockSummary?.totalStock, variants.reduce((sum, item) => sum + item.stock, 0)));
  const inStockVariants = Math.max(0, asNumber(apiProduct.stockSummary?.inStockVariants, variants.filter((item) => item.inStock).length));
  const outOfStockVariants = Math.max(0, asNumber(apiProduct.stockSummary?.outOfStockVariants, Math.max(0, variants.length - inStockVariants)));
  const hasAnyStock = (apiProduct.stockSummary?.hasAnyStock ?? totalStock > 0) === true;

  const normalizePromotions = (promotions: ApiPromotion[] | null | undefined): ProductPromotionViewModel[] => {
    return (promotions || []).map((promotion) => ({
      variantId: typeof promotion.variantId === 'number' ? promotion.variantId : null,
      code: promotion.code ?? null,
      percent: clampPercent(promotion.percent),
      scope: asPromoScope(promotion.scope)
    }));
  };

  return {
    id: apiProduct.id,
    slug: apiProduct.slug,
    name: apiProduct.name,
    brand: asString(apiProduct.brand, ''),
    description: asString(apiProduct.description, ''),
    breadcrumbs: buildBreadcrumbs(categories),
    pricing: normalizePricing(apiProduct),
    stockSummary: {
      totalStock,
      inStockVariants,
      outOfStockVariants,
      hasAnyStock
    },
    categories,
    colors,
    sizes,
    defaultImages,
    imagesByColor,
    globalPromotions: normalizePromotions(apiProduct.globalPromotions),
    variantPromotions: normalizePromotions(apiProduct.variantPromotions),
    variants,
    selectionMatrix: matrix
  };
}
