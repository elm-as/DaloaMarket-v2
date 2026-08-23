import type { ListingFormValues } from '../pages/ListingCreatePage';
import type { ListingVariant } from '../types/listing';

const DRAFT_STORAGE_KEY = 'daloamarket_listing_draft_v2';
const DRAFT_PHOTOS_KEY = 'daloamarket_listing_draft_photos_v2';

export interface ListingDraftData {
  step: number;
  values: ListingFormValues;
  variants: ListingVariant[];
  savedAt: number;
}

export interface StoredPhoto {
  name: string;
  type: string;
  dataUrl: string;
}

export const listingDraftService = {
  /**
   * Sauvegarde le brouillon actuel dans le localStorage
   */
  saveDraft(step: number, values: ListingFormValues, variants: ListingVariant[]): void {
    try {
      // Ne pas sauvegarder si tout est vide
      const hasAnyContent =
        values.title?.trim() ||
        values.description?.trim() ||
        values.price?.trim() ||
        values.category ||
        variants.length > 0;

      if (!hasAnyContent) {
        return;
      }

      const draft: ListingDraftData = {
        step,
        values,
        variants,
        savedAt: Date.now(),
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Impossible de sauvegarder le brouillon dans le localStorage', e);
    }
  },

  /**
   * Sauvegarde les photos (en Base64) pour survivre au rafraîchissement
   */
  async savePhotos(photos: File[]): Promise<void> {
    try {
      if (!photos || photos.length === 0) {
        sessionStorage.removeItem(DRAFT_PHOTOS_KEY);
        return;
      }

      // Convertir jusqu'à 5 photos en DataURL pour stockage temporaire
      const storedList: StoredPhoto[] = [];
      for (const file of photos.slice(0, 5)) {
        // Ignorer les fichiers > 4Mo pour éviter de surcharger le storage
        if (file.size > 4 * 1024 * 1024) continue;

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        storedList.push({
          name: file.name,
          type: file.type,
          dataUrl,
        });
      }

      sessionStorage.setItem(DRAFT_PHOTOS_KEY, JSON.stringify(storedList));
    } catch (e) {
      console.warn('Impossible de sauvegarder les photos temporaires', e);
    }
  },

  /**
   * Récupère le brouillon s'il existe (valable 7 jours)
   */
  getDraft(): ListingDraftData | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;

      const draft: ListingDraftData = JSON.parse(raw);
      // Expiration : 7 jours
      if (Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
        this.clearDraft();
        return null;
      }

      return draft;
    } catch {
      return null;
    }
  },

  /**
   * Restaure les fichiers photos depuis le sessionStorage
   */
  getStoredPhotos(): File[] {
    try {
      const raw = sessionStorage.getItem(DRAFT_PHOTOS_KEY);
      if (!raw) return [];

      const storedList: StoredPhoto[] = JSON.parse(raw);
      const files: File[] = [];

      for (const item of storedList) {
        const arr = item.dataUrl.split(',');
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        files.push(new File([u8arr], item.name, { type: item.type }));
      }

      return files;
    } catch {
      return [];
    }
  },

  /**
   * Efface le brouillon (par exemple après publication réussie ou au clic sur "Recommencer")
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      sessionStorage.removeItem(DRAFT_PHOTOS_KEY);
    } catch (e) {
      console.warn('Erreur suppression brouillon', e);
    }
  },
};
