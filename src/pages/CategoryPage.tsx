import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import SearchPage from './SearchPage';
import { useSEO } from '../hooks/useSEO';

const CATEGORY_MAP: Record<string, { id: string; label: string; description: string }> = {
  'electronique': {
    id: 'electronics',
    label: 'Électronique & High-tech',
    description: 'Achetez et vendez des téléphones, ordinateurs, téléviseurs et accessoires high-tech à Daloa sur DaloaMarket.',
  },
  'electronics': {
    id: 'electronics',
    label: 'Électronique & High-tech',
    description: 'Achetez et vendez des téléphones, ordinateurs, téléviseurs et accessoires high-tech à Daloa sur DaloaMarket.',
  },
  'vehicules': {
    id: 'vehicles',
    label: 'Auto & Moto',
    description: 'Voitures, motos, pièces détachées et accessoires auto/moto à vendre à Daloa.',
  },
  'vehicles': {
    id: 'vehicles',
    label: 'Auto & Moto',
    description: 'Voitures, motos, pièces détachées et accessoires auto/moto à vendre à Daloa.',
  },
  'mode': {
    id: 'fashion',
    label: 'Mode & Accessoires',
    description: 'Vêtements, chaussures, sacs, bijoux et accessoires de mode à Daloa.',
  },
  'fashion': {
    id: 'fashion',
    label: 'Mode & Accessoires',
    description: 'Vêtements, chaussures, sacs, bijoux et accessoires de mode à Daloa.',
  },
  'maison-deco': {
    id: 'home',
    label: 'Maison & Jardin',
    description: 'Meubles, électroménager, décoration et articles de maison à Daloa.',
  },
  'home': {
    id: 'home',
    label: 'Maison & Jardin',
    description: 'Meubles, électroménager, décoration et articles de maison à Daloa.',
  },
  'sports-loisirs': {
    id: 'sports',
    label: 'Sports & Loisirs',
    description: 'Équipements sportifs, vélos, jeux et articles de loisirs à Daloa.',
  },
  'sports': {
    id: 'sports',
    label: 'Sports & Loisirs',
    description: 'Équipements sportifs, vélos, jeux et articles de loisirs à Daloa.',
  },
  'livres': {
    id: 'books',
    label: 'Livres & Culture',
    description: 'Livres scolaires, romans, fournitures et matériel culturel à Daloa.',
  },
  'books': {
    id: 'books',
    label: 'Livres & Culture',
    description: 'Livres scolaires, romans, fournitures et matériel culturel à Daloa.',
  },
  'alimentaire': {
    id: 'food',
    label: 'Alimentaire & Produits locaux',
    description: 'Produits vivriers, épicerie et spécialités locales à Daloa.',
  },
  'food': {
    id: 'food',
    label: 'Alimentaire & Produits locaux',
    description: 'Produits vivriers, épicerie et spécialités locales à Daloa.',
  },
};

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const slug = (categorySlug || '').toLowerCase();
  const config = CATEGORY_MAP[slug];

  if (!config && slug) {
    return <Navigate to="/search" replace />;
  }

  const categoryName = config?.label || 'Toutes les catégories';
  const categoryDesc = config?.description || 'Découvrez les meilleures annonces à Daloa par catégorie sur DaloaMarket.';
  const canonicalUrl = `https://daloamarket.shop/${slug || 'search'}`;

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryName} à Daloa | DaloaMarket`,
    description: categoryDesc,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'DaloaMarket',
      url: 'https://daloamarket.shop',
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
        item: 'https://daloamarket.shop',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: canonicalUrl,
      },
    ],
  };

  useSEO(`${categoryName} à Daloa`, {
    description: categoryDesc,
    keywords: `${categoryName}, annonces ${categoryName} Daloa, acheter ${categoryName} Daloa, vente ${categoryName} Côte d'Ivoire`,
    ogTitle: `${categoryName} à Daloa — DaloaMarket`,
    ogDescription: categoryDesc,
    canonical: canonicalUrl,
    jsonLd: [collectionSchema, breadcrumbSchema],
  });

  return <SearchPage defaultCategory={config?.id} categoryLabel={categoryName} />;
}
