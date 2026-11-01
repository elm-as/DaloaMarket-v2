import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Upload,
  Loader2,
  Eye,
  MousePointerClick,
  Check,
  ArrowRight,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { cn, formatPrice } from '../../lib/utils';
import { Card } from '../ui/Card';

interface PromoBannerItem {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  badge_text?: string | null;
  badge_color?: string | null;
  link_type: string;
  link_target?: string | null;
  views_count: number;
  clicks_count: number;
  is_active: boolean;
  ends_at?: string | null;
  starts_at?: string | null;
}

interface BannerPack {
  id: string;
  days: number;
  price: number;
  tag: string;
  perDay: number;
}

const CAROUSEL_PACKS: BannerPack[] = [
  { id: 'carousel_7d', days: 7, price: 3000, tag: 'SEMAINE', perDay: 428 },
  { id: 'carousel_14d', days: 14, price: 5000, tag: 'POPULAIRE', perDay: 357 },
  { id: 'carousel_30d', days: 30, price: 10000, tag: 'MOIS COMPLET', perDay: 333 },
];

export const ProfileCarouselTab: React.FC<{ user: any; userProfile: any }> = ({ user, userProfile }) => {
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;
  const [banners, setBanners] = useState<PromoBannerItem[]>([]);
  const [userListings, setUserListings] = useState<{ id: string; title: string; price: number; photos: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPackIndex, setSelectedPackIndex] = useState(1);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeText] = useState('VEDETTE PRO');
  const [badgeColor] = useState('#EA580C');
  const [selectedListingId, setSelectedListingId] = useState<string>('');

  const fetchSellerData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [bannersRes, listingsRes] = await Promise.all([
        supabase.from('promo_banners').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
        supabase.from('listings').select('id, title, price, photos').eq('user_id', user.id).eq('status', 'active').limit(20),
      ]);
      setBanners((bannersRes.data as any) || []);
      setUserListings((listingsRes.data as any) || []);
    } catch {
      toast.error('Erreur chargement des données Carrousel');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSellerData();
  }, [fetchSellerData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `banners/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success('Visuel téléversé avec succès');
    } catch {
      toast.error('Échec du téléversement du visuel');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectListing = (listingId: string) => {
    if (selectedListingId === listingId) {
      setSelectedListingId('');
      return;
    }
    setSelectedListingId(listingId);
    const listing = userListings.find((l) => l.id === listingId);
    if (listing) {
      setTitle(listing.title.slice(0, 50));
      if (listing.photos?.[0]) setImageUrl(listing.photos[0]);
      if (!subtitle) setSubtitle(`Disponible dès maintenant à ${formatPrice(listing.price)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      toast.error('Choisissez un article ou téléversez un visuel avec un titre');
      return;
    }
    const pack = CAROUSEL_PACKS[selectedPackIndex];
    setCreating(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + pack.days * 86400000);
      const record = {
        seller_id: user.id,
        sponsor_name: userProfile?.shop_name || userProfile?.full_name || 'Vendeur Pro',
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl.trim(),
        badge_text: badgeText.trim() || 'VEDETTE PRO',
        badge_color: badgeColor,
        link_type: selectedListingId ? 'listing' : 'seller',
        link_target: selectedListingId || user.id,
        price_paid: 0,
        priority: 0,
        views_count: 0,
        clicks_count: 0,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        is_active: false,
      };

      const { error } = await supabase.from('promo_banners').insert(record);
      if (error) throw error;

      toast.success("Affiche soumise ! Elle sera activée dès validation par l'équipe.");
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setSelectedListingId('');
      fetchSellerData();
    } catch {
      toast.error('Impossible de publier l’affiche');
    } finally {
      setCreating(false);
    }
  };

  if (!isPro) {
    return (
      <Card elevation={2} padding="md" className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="mb-1 text-base font-extrabold text-gray-900">
          Carrousel Accueil VIP — Exclusivité Vendeurs Pro
        </h3>
        <p className="mx-auto max-w-md text-xs text-gray-600">
          Faites afficher votre boutique ou vos articles phares tout en haut de l'accueil de DaloaMarket devant tous les acheteurs.
        </p>
      </Card>
    );
  }

  const activePack = CAROUSEL_PACKS[selectedPackIndex];

  return (
    <div className="space-y-4">
      {/* 1. APERÇU EN DIRECT MOBILE-FIRST */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-900">Aperçu en tête d’accueil</span>
          <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
            Format 16:9 Mobile & Web
          </span>
        </div>

        <div className="relative h-40 sm:h-48 w-full overflow-hidden rounded-2xl bg-slate-900">
          {imageUrl ? (
            <img src={imageUrl} alt="Aperçu" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center">
              <Sparkles className="mb-1.5 h-6 w-6 text-amber-400" />
              <p className="text-xs font-semibold text-slate-300">
                Sélectionnez un article ci-dessous ou téléversez une photo
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span
                style={{ backgroundColor: badgeColor }}
                className="rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider text-white uppercase"
              >
                {badgeText}
              </span>
              <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs truncate max-w-[140px]">
                {userProfile?.shop_name || userProfile?.full_name || 'Ma Boutique'}
              </span>
            </div>

            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm sm:text-base font-black text-white">
                  {title || 'Titre de votre affiche promotionnelle'}
                </p>
                <p className="truncate text-[11px] text-white/85">
                  {subtitle || 'Sous-titre ou offre spéciale à Daloa'}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-[11px] font-extrabold text-white">
                <span>Voir</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FORMULAIRE DE CRÉATION FLUIDE SUR MOBILE */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        {/* Étape A : Choix rapide d'un article avec miniature */}
        {userListings.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-extrabold text-gray-900">
              1. Choisir quoi mettre en avant (1 clic)
            </label>
            <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() => setSelectedListingId('')}
                className={cn(
                  'flex h-14 shrink-0 items-center gap-2.5 rounded-2xl border px-3 text-left transition-all',
                  selectedListingId === ''
                    ? 'border-2 border-orange-500 bg-orange-50/70'
                    : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Store className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-900">Toute ma boutique</p>
                  <p className="text-[10px] text-gray-500">Vitrine complète</p>
                </div>
              </button>

              {userListings.map((item) => {
                const isSelected = selectedListingId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectListing(item.id)}
                    className={cn(
                      'flex h-14 w-48 shrink-0 items-center gap-2.5 rounded-2xl border p-1.5 pr-3 text-left transition-all',
                      isSelected
                        ? 'border-2 border-orange-500 bg-orange-50/70'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <img
                      src={item.photos?.[0] || ''}
                      alt={item.title}
                      className="h-10 w-10 shrink-0 rounded-xl bg-gray-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-gray-900">{item.title}</p>
                      <p className="text-[11px] font-extrabold text-orange-600 tabular-nums">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape B : Durée de diffusion (Radio Cards propres) */}
        <div>
          <label className="mb-2 block text-xs font-extrabold text-gray-900">
            2. Durée de diffusion
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CAROUSEL_PACKS.map((pack, idx) => {
              const isSelected = selectedPackIndex === idx;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackIndex(idx)}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative flex flex-col justify-between rounded-2xl p-2.5 text-left transition-all',
                    isSelected
                      ? 'border-2 border-orange-500 bg-orange-50/60'
                      : 'border border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn('text-[9px] font-black uppercase', isSelected ? 'text-orange-700' : 'text-gray-400')}>
                      {pack.tag}
                    </span>
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border',
                        isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white'
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <p className="text-xs font-extrabold text-gray-900">{pack.days} jours</p>
                    <p className={cn('text-sm font-black tabular-nums', isSelected ? 'text-orange-600' : 'text-gray-900')}>
                      {formatPrice(pack.price)}
                    </p>
                    <p className="text-[10px] text-gray-400 tabular-nums">~{pack.perDay} F / j</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Étape C : Textes & Visuel */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Titre de l’affiche *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Arrivage Robes & Chaussures"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-xs font-medium text-gray-900 outline-none focus:border-orange-500 focus:bg-white"
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Sous-titre / Offre</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: -20% cette semaine à Tazibouo"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-xs font-medium text-gray-900 outline-none focus:border-orange-500 focus:bg-white"
              maxLength={90}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Image de couverture *</label>
          <div className="flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50/40 px-3 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-50 transition-colors">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              <span>{imageUrl ? 'Changer la photo depuis le téléphone' : 'Choisir une photo depuis le téléphone'}</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || uploading || loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 text-xs sm:text-sm font-black text-white shadow-md shadow-orange-600/20 transition-all hover:bg-orange-700 active:scale-[0.99] disabled:opacity-50"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          <span>Diffuser {activePack.days} jours · {formatPrice(activePack.price)}</span>
        </button>
      </form>

      {/* 3. MES AFFICHES EN DIFFUSION */}
      {banners.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="px-1 text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Mes affiches ({banners.length})
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {banners.map((b) => {
              const daysLeft = b.ends_at
                ? Math.ceil((new Date(b.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-2xs">
                  <img src={b.image_url} alt={b.title} className="h-14 w-20 shrink-0 rounded-xl bg-gray-100 object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h5 className="truncate text-xs font-bold text-gray-900">{b.title}</h5>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold',
                          !b.is_active ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        )}
                      >
                        {!b.is_active ? 'En validation' : daysLeft != null && daysLeft > 0 ? `${daysLeft}j restants` : 'Terminé'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] tabular-nums text-gray-500">
                      <span className="inline-flex items-center gap-1"><Eye size={12} /> {b.views_count} vues</span>
                      <span className="inline-flex items-center gap-1 font-bold text-orange-600">
                        <MousePointerClick size={12} /> {b.clicks_count} clics
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
