import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Upload,
  Loader2,
  Eye,
  MousePointerClick,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
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
  label: string;
  popular?: boolean;
}

const CAROUSEL_PACKS: BannerPack[] = [
  { id: 'carousel_7d', days: 7, price: 3000, label: '7 jours de diffusion' },
  { id: 'carousel_14d', days: 14, price: 5000, label: '14 jours de diffusion', popular: true },
  { id: 'carousel_30d', days: 30, price: 10000, label: '30 jours de diffusion' },
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
  const [badgeText, setBadgeText] = useState('VEDETTE PRO');
  const [badgeColor] = useState('#FF9800');
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
    setSelectedListingId(listingId);
    const listing = userListings.find((l) => l.id === listingId);
    if (listing) {
      if (!title) setTitle(listing.title.slice(0, 50));
      if (!imageUrl && listing.photos?.[0]) setImageUrl(listing.photos[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      toast.error('Le titre et le visuel sont requis');
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

      toast.success(`Affiche soumise ! Elle sera validée et activée par l'administrateur.`);
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
        <p className="mx-auto mb-4 max-w-md text-xs text-gray-600">
          Faites afficher votre boutique ou vos articles phares tout en haut de l'accueil de l'application
          DaloaMarket devant des milliers d'acheteurs.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
            <Sparkles size={20} />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Sponsoring Carrousel Accueil VIP</h3>
            <p className="text-xs text-gray-500">Emplacement n°1 en tête de l’application réservé aux abonnés Pro</p>
          </div>
        </div>
      </div>

      {banners.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Mes affiches en diffusion ({banners.length})
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {banners.map((b) => {
              const daysLeft = b.ends_at
                ? Math.ceil((new Date(b.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div key={b.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative h-28 w-full bg-gray-100">
                    <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                    {b.badge_text && (
                      <span
                        style={{ backgroundColor: b.badge_color || '#FF9800' }}
                        className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-black text-white shadow"
                      >
                        {b.badge_text}
                      </span>
                    )}
                    <span className={`absolute bottom-2 right-2 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur ${!b.is_active ? 'bg-amber-600/90' : 'bg-black/60'}`}>
                      {!b.is_active ? 'En attente' : daysLeft != null && daysLeft > 0 ? `Reste ${daysLeft}j` : 'Terminé'}
                    </span>
                  </div>
                  <div className="p-3">
                    <h5 className="text-xs font-bold text-gray-900 truncate">{b.title}</h5>
                    <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-gray-500">
                      <span className="flex items-center gap-1"><Eye size={13} /> {b.views_count} vues</span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-600"><MousePointerClick size={13} /> {b.clicks_count} clics</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-bold text-gray-900">Créer une nouvelle affiche pour le carrousel</h4>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700">Formule de diffusion</label>
          <div className="grid grid-cols-3 gap-2">
            {CAROUSEL_PACKS.map((pack: BannerPack, idx: number) => {
              const active = selectedPackIndex === idx;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackIndex(idx)}
                  className={`rounded-2xl border p-2.5 text-center transition-all ${
                    active ? 'border-orange-500 bg-orange-50/70 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900">{pack.days} jours</p>
                  <p className="text-sm font-black text-orange-600 tabular-nums">{formatPrice(pack.price)} F</p>
                </button>
              );
            })}
          </div>
        </div>

        {userListings.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Associer à un article de votre boutique (Optionnel)
            </label>
            <select
              value={selectedListingId}
              onChange={(e) => handleSelectListing(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none"
            >
              <option value="">Rediriger vers toute ma boutique</option>
              {userListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({formatPrice(l.price)} FCFA)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Titre de l’affiche *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Arrivage Robes & Chaussures VIP"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-orange-500"
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Sous-titre / Promo</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: -25% cette semaine à Tazibouo"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-orange-500"
              maxLength={100}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Affiche 16:9 (HD) *</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... ou téléverser"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-orange-500"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Téléverser</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {imageUrl && (
          <div className="relative h-28 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-inner">
            <img src={imageUrl} alt="Aperçu" className="h-full w-full object-cover opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 flex flex-col justify-between">
              <span
                style={{ backgroundColor: badgeColor }}
                className="self-start rounded-full px-2 py-0.5 text-[9px] font-black text-white uppercase shadow"
              >
                {badgeText}
              </span>
              <div>
                <p className="text-sm font-extrabold text-white leading-tight">{title || 'Titre de l’affiche'}</p>
                {subtitle && <p className="text-xs text-white/90">{subtitle}</p>}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={creating || uploading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          <span>Diffuser sur le Carrousel ({formatPrice(CAROUSEL_PACKS[selectedPackIndex].price)} F)</span>
        </button>
      </form>
    </div>
  );
};
