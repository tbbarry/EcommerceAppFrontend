import { environment } from '../../environments/environment';

export function resolveProductImageUrl(imagePath: string): string {
  if (/^(?:https?:|data:|blob:)/i.test(imagePath) || imagePath.startsWith('/') || imagePath.startsWith('assets/')) {
    return imagePath;
  }

  const baseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');
  return `${baseUrl}/api/images/products/${imagePath.replace(/\\/g, '/')}`;
}
