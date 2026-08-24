# DaloaMarket — Prototype Android natif (Kotlin + Jetpack Compose)

Prototype d'application 100% native (sans Capacitor ni WebView) pour évaluer le rendu d'une app moderne avec le design system DaloaMarket.

## Contenu

- **Thème Compose** reprenant la palette Tailwind du site (orange `#FF9800`, arrondis 16px, typographie bold) — `ui/theme/Theme.kt`
- **Écran d'accueil** : header dégradé avec barre de recherche, chips de catégories animés, grille d'annonces
- **Données réelles** : les annonces sont chargées depuis Supabase (API REST publique, clé publishable) — `data/ListingsRepository.kt`
- **Navigation bottom bar** 5 onglets (seul l'accueil est fonctionnel dans ce prototype)

## Stack

- Kotlin 2.0 + Jetpack Compose (Material 3, thème custom)
- Coil (chargement d'images), OkHttp + kotlinx.serialization (REST Supabase)
- minSdk 24, targetSdk 34

## Build

```bash
cd android-native
echo "sdk.dir=/chemin/vers/android-sdk" > local.properties
./gradlew assembleDebug
# APK : app/build/outputs/apk/debug/app-debug.apk
```
