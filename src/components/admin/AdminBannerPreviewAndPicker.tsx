import React, { useState, useEffect } from 'react';
import { Search, Sparkles, ArrowRight, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import type { BannerFormData } from './AdminBannerModal';

export const JUMIA_BADGE_PRESETS = [
  { label: '🔥 VENTE FLASH', color: '#DC2626' },
  { label: '⚡ OFFRE DU JOUR', color: '#EA580C' },
  { label: '👑 BOUTIQUE PRO', color: '#7C3AED' },
  { label: '🎁 BON PLAN', color: '#16A34A' },
  { label: '🆕 NOUVEAU', color: '#2563EB' },
];

interface ListingQuickChoice {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  photos: string[] | null;
  district: string | null;
  users?: { full_name?: string | null; shop_name?: string | null } | null;
}

interface AdminBannerPreviewAndPickerProps {
  formData: BannerFormData;
  onPatch: (changes: Partial<BannerFormData>) => void;
}

export const AdminBannerPreviewAndPicker: React.FC<AdminBannerPreviewAndPickerProps> = ({
  formData,
  onPatch,
}) => {
  const [listings, setListings] = useState<ListingQuickChoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!showPicker) return;
    supabase
      .from('listings')
      .select('id, title, price, original_price, photos, district, users!listings_user_id_fkey(full_name, shop_name)')
      .eq('status', 'active')
      .not('photos', 'eq', '{}')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setListings(data as unknown as ListingQuickChoice[]);
      });
  }, [showPicker]);

  const filtered = listings.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      (l.users?.shop_name && l.users.shop_name.toLowerCase().includes(q)) ||
      (l.users?.full_name && l.users.full_name.toLowerCase().includes(q))
    );
  });

  const handleSelectListing = (item: ListingQuickChoice) => {
    const photo = item.photos?.[0] || '';
    const hasDiscount = item.original_price != null && item.original_price > item.price;
    const discountPct = hasDiscount
      ? Math.round(((item.original_price! - item.price) / item.original_price!) * 100)
      : null;

    const subtitle = hasDiscount
      ? `Promo ${formatPrice(item.price)} F au lieu de ${formatPrice(item.original_price!)} F (-${discountPct}%) · ${item.district || 'Daloa'}`
      : `Disponible à ${formatPrice(item.price)} FCFA · Quartier ${item.district || 'Daloa'}`;

    const sponsor = item.users?.shop_name || item.users?.full_name || 'Boutique Daloa';

    onPatch({
      title: item.title.slice(0, 65),
      subtitle,
      image_url: photo || formData.image_url,
      link_type: 'listing',
      link_target: item.id,
      sponsor_name: sponsor,
      badge_text: discountPct ? `🔥 FLASH -${discountPct}%` : '⚡ OFFRE DU JOUR',
      badge_color: discountPct ? '#DC2626' : '#EA580C',
    });
    setShowPicker(false);
    toast.success('Annonce importée dans l’affiche !');
  };

  return (
    <div className="space-y-3">
      {/* Sélecteur rapide d'annonce existante */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-red-600" />
            <span className="text-xs font-bold text-gray-900">
              Pré-remplir depuis une annonce du catalogue
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker((prev) => !prev)}
            className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-orange-600 ring-1 ring-orange-200 hover:bg-orange-50"
          >
            {showPicker ? 'Fermer' : 'Choisir un article'}
          </button>
        </div>

        {showPicker && (
          <div className="mt-2.5 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre ou boutique..."
                className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectListing(item)}
                  className="flex w-full items-center gap-2.5 p-2 text-left hover:bg-orange-50/60 transition-colors"
                >
                  {item.photos?.[0] ? (
                    <img src={item.photos[0]} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-900">{item.title}</p>
                    <p className="text-[11px] text-gray-500 tabular-nums">
                      <strong className="text-orange-600">{formatPrice(item.price)} F</strong>
                      {item.original_price && item.original_price > item.price
                        ? ` (au lieu de ${formatPrice(item.original_price)} F)`
                        : ''}{' '}
                      · {item.users?.shop_name || item.users?.full_name || 'Vendeur'}
                    </p>
                  </div>
                  <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                    Importer
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-3 text-center text-xs text-gray-400">Aucune annonce trouvée</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Préréglages de badges façon Jumia */}
      <div>
        <p className="mb-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wide">
          Tags promos rapides (style Jumia)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {JUMIA_BADGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onPatch({ badge_text: preset.label, badge_color: preset.color })}
              style={{ backgroundColor: preset.color }}
              className="rounded-full px-2.5 py-1 text-[10px] font-black text-white uppercase shadow-2xs hover:opacity-90 transition-opacity"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu Live Haute-Fidélité Jumia */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 uppercase tracking-wide">
            <Sparkles size={12} className="text-orange-500" /> Aperçu temps réel du carrousel
          </span>
          <span className="text-[10px] text-gray-400">Mobile & Web</span>
        </div>

        <div className="relative flex h-40 w-full flex-col justify-between overflow-hidden rounded-2xl border border-orange-200/80 bg-slate-950 p-4 shadow-md">
          {formData.image_url ? (
            <img
              src={formData.image_url}
              alt="Aperçu"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/10" />

          <div className="relative z-10 flex items-center justify-between gap-2">
            {formData.badge_text ? (
              <span
                style={{ backgroundColor: formData.badge_color || '#EA580C' }}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs"
              >
                {formData.badge_text}
              </span>
            ) : (
              <span />
            )}
            {formData.sponsor_name ? (
              <span className="rounded-full border border-white/20 bg-slate-900/70 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                {formData.sponsor_name}
              </span>
            ) : null}
          </div>

          <div className="relative z-10 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white">
                {formData.title || 'Titre de votre campagne promo'}
              </p>
              <p className="line-clamp-1 text-xs font-medium text-white/90">
                {formData.subtitle || 'Sous-titre descriptif ou réduction en FCFA'}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm">
              J'en profite <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

