import { Capacitor } from '@capacitor/core';

/**
 * Service utilitaire pour les fonctionnalités mobiles natives (Capacitor).
 * Fournit un fallback silencieux et sécurisé lorsque l'application s'exécute dans un navigateur Web classique.
 */

export interface PositionCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export class MobileNativeService {
  /**
   * Indique si l'application s'exécute dans un conteneur natif iOS ou Android.
   */
  public static isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Retourne la plateforme courante ('ios', 'android' ou 'web').
   */
  public static getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Déclenche une vibration haptique légère lors d'une interaction tactile (bouton, sélection).
   */
  public static async triggerLightHaptic(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Ignore les erreurs si le plugin n'est pas disponible
    }
  }

  /**
   * Déclenche une vibration de succès lors de la validation d'un formulaire ou d'une transaction.
   */
  public static async triggerSuccessHaptic(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Fallback
    }
  }

  /**
   * Déclenche une vibration d'avertissement ou d'erreur.
   */
  public static async triggerErrorHaptic(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Fallback
    }
  }

  /**
   * Obtient la position GPS actuelle avec haute précision.
   */
  public static async getCurrentPosition(): Promise<PositionCoordinates | null> {
    if (this.isNativePlatform()) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (error) {
        console.warn('[MobileNative] Erreur Geolocation native:', error);
      }
    }

    // Fallback navigateur web HTML5 Geolocation API
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /**
   * Demande la prise de photo via la caméra native ou le sélecteur de fichier.
   */
  public static async capturePhoto(): Promise<string | null> {
    if (this.isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera
        });
        return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
      } catch (error) {
        console.warn('[MobileNative] Capture caméra annulée ou échouée:', error);
        return null;
      }
    }
    return null;
  }
}
