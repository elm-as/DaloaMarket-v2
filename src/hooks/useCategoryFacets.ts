import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORY_CATALOG } from '../lib/categoryCatalog';
import { CONDITIONS } from '../lib/utils';

/**
 * Facettes de navigation par catégorie.
 *
 * `listings` ne porte pas de colonne sous-catégorie : l'arborescence est donc
 * construite sur les facettes réellement présentes en base (catégories soeurs,
 * état, quartier, prix). Les compteurs sont calculés côté client à partir d'une
 * projection légère (4 colonnes) de l'ensemble des annonces actives, ce qui
 * évite 20+ requêtes `count` séparées à chaque changement de filtre.
 */

interface FacetRow {
  category: string;
  condition: string;
  district: string;
  price: number;
}

export interface FacetBucket {
  id: string;
  label: string;
  count: number;
}

export interface CategoryFacets {
  /** Nombre d'annonces actives par catégorie, toutes catégories confondues */
  countByCategory: Record<string, number>;
  /** États présents dans la catégorie courante (filtres croisés appliqués) */
  conditions: FacetBucket[];
  /** Quartiers présents dans la catégorie courante (filtres croisés appliqués) */
  districts: FacetBucket[];
  /** Bornes de prix réelles de la catégorie courante */
  priceBounds: { min: number; max: number };
}

export interface FacetSelection {
  condition: string;
  district: string;
  priceMin: string;
  priceMax: string;
}

const PAGE = 1000;
const MAX_ROWS = 6000;
const TTL_MS = 3 * 60 * 1000;

let cache: { rows: FacetRow[]; timestamp: number } | null = null;
let inflight: Promise<FacetRow[]> | null = null;

async function fetchFacetRows(): Promise<FacetRow[]> {
  const fresh = cache && Date.now() - cache.timestamp < TTL_MS;
  if (cache && fresh) return cache.rows;
  if (inflight) return inflight;

  inflight = (async () => {
    const rows: FacetRow[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await supabase
        .from('listings')
        .select('category, condition, district, price')
        .eq('status', 'active')
        .range(from, from + PAGE - 1);

      if (error) throw error;
      const batch = (data || []) as unknown as FacetRow[];
      rows.push(...batch);
      if (batch.length < PAGE) break;
    }
    cache = { rows, timestamp: Date.now() };
    return rows;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.id, c.label]),
);

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Compte les annonces par valeur d'une dimension, en appliquant les autres
 * filtres actifs mais jamais celui de la dimension mesurée (règle de facette :
 * un compteur doit rester cliquable après sélection d'une valeur voisine).
 */
function countBy(
  rows: FacetRow[],
  dimension: 'condition' | 'district',
  selection: FacetSelection,
): Map<string, number> {
  const min = toNumber(selection.priceMin);
  const max = toNumber(selection.priceMax);
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (dimension !== 'condition' && selection.condition && row.condition !== selection.condition) continue;
    if (dimension !== 'district' && selection.district && row.district !== selection.district) continue;
    if (min !== null && row.price < min) continue;
    if (max !== null && row.price > max) continue;

    const key = row[dimension];
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

export function useCategoryFacets(categoryId: string, selection: FacetSelection) {
  const [rows, setRows] = useState<FacetRow[]>(() => cache?.rows || []);
  const [loading, setLoading] = useState(() => !cache);

  useEffect(() => {
    let cancelled = false;
    fetchFacetRows()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        // Les facettes sont un confort de navigation : en cas d'échec on laisse
        // la grille de résultats fonctionner sans compteurs.
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo<CategoryFacets>(() => {
    const countByCategory: Record<string, number> = {};
    for (const category of CATEGORY_CATALOG) countByCategory[category.id] = 0;

    const categoryRows: FacetRow[] = [];
    for (const row of rows) {
      countByCategory[row.category] = (countByCategory[row.category] || 0) + 1;
      if (row.category === categoryId) categoryRows.push(row);
    }

    const conditionCounts = countBy(categoryRows, 'condition', selection);
    const districtCounts = countBy(categoryRows, 'district', selection);

    const conditions: FacetBucket[] = CONDITIONS.filter((c) => conditionCounts.has(c.id)).map((c) => ({
      id: c.id,
      label: c.label,
      count: conditionCounts.get(c.id) || 0,
    }));

    const districts: FacetBucket[] = Array.from(districtCounts.entries())
      .map(([id, count]) => ({ id, label: id, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));

    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const row of categoryRows) {
      if (row.price < min) min = row.price;
      if (row.price > max) max = row.price;
    }
    if (!Number.isFinite(min)) min = 0;

    return {
      countByCategory,
      conditions,
      districts,
      priceBounds: { min, max },
    };
  }, [rows, categoryId, selection]);

  return { facets, loading };
}

export { CONDITION_LABELS };
