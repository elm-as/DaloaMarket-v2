import { useSEO } from './useSEO';
import { getCategoryUrl, type CategoryConfig } from '../lib/categoryCatalog';

/**
 * Métadonnées et données structurées d'une page catégorie
 * (CollectionPage + fil d'Ariane).
 */
export function useCategorySEO(category: CategoryConfig | undefined) {
  const label = category?.label || 'Toutes les catégories';
  const description =
    category?.description ||
    'Découvrez les meilleures annonces à Daloa par catégorie sur DaloaMarket.';
  const canonical = category ? getCategoryUrl(category) : 'https://daloamarket.com/search';

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} à Daloa | DaloaMarket`,
    description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: 'DaloaMarket',
      url: 'https://daloamarket.com',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: 'https://daloamarket.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: canonical,
      },
    ],
  };

  useSEO(`${label} à Daloa`, {
    description,
    keywords: `${label}, annonces ${label} Daloa, acheter ${label} Daloa, vente ${label} Côte d'Ivoire`,
    ogTitle: `${label} à Daloa : DaloaMarket`,
    ogDescription: description,
    canonical,
    jsonLd: [collectionSchema, breadcrumbSchema],
  });
}
