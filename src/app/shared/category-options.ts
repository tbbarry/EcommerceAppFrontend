import { AdminCategory } from '../models/admin-product.model';

export function flattenCategoryOptions(categories: AdminCategory[], prefix = ''): { id: number; label: string }[] {
  return categories.flatMap(category => {
    const label = prefix ? `${prefix} / ${category.name}` : category.name;
    return [{ id: category.id, label }, ...flattenCategoryOptions(category.children ?? [], label)];
  });
}
