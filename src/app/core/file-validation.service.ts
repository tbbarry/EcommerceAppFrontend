/**
 * Service pour gérer la validation et conversion des fichiers
 * Utilisé par le composant d'ajout de produit
 */

import { Injectable } from '@angular/core';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileValidationService {
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_IMAGES = 10;

  /**
   * Valide un fichier image
   */
  validateImageFile(file: File): FileValidationResult {
    // Vérifie le type MIME
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Format non supporté. Utilisez JPG ou PNG.`
      };
    }

    // Vérifie la taille
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Fichier trop volumineux. Maximum 5MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Vérifie si on peut ajouter plus d'images
   */
  canAddMoreImages(currentCount: number): boolean {
    return currentCount < this.MAX_IMAGES;
  }

  /**
   * Convertit un fichier en base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compresse une image (optionnel pour optimiser)
   */
  async compressImage(file: File, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}
